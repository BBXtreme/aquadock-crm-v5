"use server";

import type { GatewayModelId } from "@ai-sdk/gateway";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveCompanyDetail } from "@/lib/actions/companies";
import { buildCompanyEnrichmentClosedEnumPromptBlock } from "@/lib/ai/company-enrichment-closed-enums";
import {
  type CompanyEnrichmentWebSearchMode,
  runCompanyEnrichmentGeneration,
} from "@/lib/ai/company-enrichment-gateway";
import { buildAiEnrichmentFailureDiagnostic, mapAiEnrichmentGatewayPipelineError } from "@/lib/ai/enrichment-gateway-pipeline";
import { refundEnrichmentSlots, tryCommitEnrichmentSlots } from "@/lib/ai/enrichment-rate-limit";
import { ENRICHMENT_GATEWAY_MODEL_ID_CHOICES, fetchAiEnrichmentPolicy } from "@/lib/services/ai-enrichment-policy";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AppearanceLocale } from "@/lib/validations/appearance";
import {
  type BulkResearchCompanyEnrichmentInput,
  bulkResearchCompanyEnrichmentInputSchema,
  type CompanyEnrichmentResult,
} from "@/lib/validations/company-enrichment";
import type { Database } from "@/types/database.types";

/** JSON shape for `diagnostic` on failed runs — matches `EnrichmentGatewayFailureDiagnostic` in enrichment-gateway-failure-types. */
type CompanyEnrichmentFailureDiagnosticPayload = {
  stableCode: string;
  httpStatus?: number;
  gatewayMessage: string;
  generationId?: string;
  tokenUsageHint?: string;
};

export type ResearchCompanyEnrichmentResponse =
  | { ok: true; data: CompanyEnrichmentResult; modelUsed: string }
  | { ok: false; error: string; diagnostic?: CompanyEnrichmentFailureDiagnosticPayload };

export type BulkCompanyEnrichmentItemResult =
  | { companyId: string; ok: true; data: CompanyEnrichmentResult; modelUsed: string }
  | { companyId: string; ok: false; error: string; diagnostic?: CompanyEnrichmentFailureDiagnosticPayload };

export type BulkResearchCompanyEnrichmentResponse =
  | { ok: true; results: BulkCompanyEnrichmentItemResult[] }
  | { ok: false; error: string };

const SYSTEM_PROMPT = `Du bist ein präziser Recherche-Assistent für AquaDock CRM (Wasser-/Hafen-/Gastronomie-Kontext).
Nutze ausschließlich öffentlich zugängliche Fakten aus den Suchergebnissen.
Erfinde keine URLs, Telefonnummern oder Impressumsdaten.
Wenn du unsicher bist, setze den betreffenden Wert auf null und erkläre kurz in rationale (optional).
Antworte strukturiert gemäß dem vorgegebenen JSON-Schema (deutsche Inhalte).`;

const SYSTEM_PROMPT_MODEL_ONLY = `Du bist ein Assistent für AquaDock CRM (Wasser-/Hafen-/Gastronomie-Kontext).
Es findet keine Web-Recherche statt — nutze ausschließlich dein internes Wissen zum Stand deiner Trainingsdaten.
Erfinde keine URLs, Telefonnummern oder Impressumsdaten. Sei konservativ: lieber null als unsichere Vermutungen.
Antworte strukturiert gemäß dem vorgegebenen JSON-Schema (deutsche Inhalte).`;

function formatAiEnrichmentDailyRateLimitError(
  usedToday: number,
  dailyLimit: number,
  requestedSlots: number,
): string {
  return `AI_ENRICHMENT_RATE_LIMIT:${usedToday}:${dailyLimit}:${requestedSlots}`;
}

const ALLOWED_ENRICHMENT_GATEWAY_MODELS = new Set<string>(ENRICHMENT_GATEWAY_MODEL_ID_CHOICES);

/** Per-run override of structuring models (JSON phase); research phase uses a fixed fast model in the gateway. */
export type ResearchCompanyEnrichmentGatewayOverride = {
  primary?: string;
  secondary?: string;
};

function normalizeWebSearchMode(raw: unknown): CompanyEnrichmentWebSearchMode {
  if (raw === "model-only") {
    return "model-only";
  }
  return "full";
}

function normalizeGatewayModelOverride(
  raw: ResearchCompanyEnrichmentGatewayOverride | undefined,
): { primary?: GatewayModelId; secondary?: GatewayModelId } | undefined {
  if (!raw) {
    return undefined;
  }
  const primary =
    typeof raw.primary === "string" && ALLOWED_ENRICHMENT_GATEWAY_MODELS.has(raw.primary)
      ? (raw.primary as GatewayModelId)
      : undefined;
  const secondary =
    typeof raw.secondary === "string" && ALLOWED_ENRICHMENT_GATEWAY_MODELS.has(raw.secondary)
      ? (raw.secondary as GatewayModelId)
      : undefined;
  if (primary === undefined && secondary === undefined) {
    return undefined;
  }
  return { primary, secondary };
}

function isEnrichmentAbortLike(err: unknown): boolean {
  if (err instanceof DOMException && err.name === "AbortError") {
    return true;
  }
  return err instanceof Error && err.name === "AbortError";
}

async function runCompanyEnrichmentForActiveRow(
  supabase: SupabaseClient<Database>,
  companyId: string,
  run: {
    addressFocusPrioritize: boolean;
    gatewayModelOverride?: { primary?: GatewayModelId; secondary?: GatewayModelId };
    webSearchMode: CompanyEnrichmentWebSearchMode;
    crmSearchLocale: AppearanceLocale;
    perplexityFastMaxResults: number;
    perplexityFastRecency: "month" | "year";
    signal?: AbortSignal;
  },
): Promise<ResearchCompanyEnrichmentResponse> {
  try {
    const resolved = await resolveCompanyDetail(companyId, supabase);
    if (resolved.kind !== "active") {
      return { ok: false, error: "COMPANY_NOT_FOUND" };
    }

    const c = resolved.company;
    const context = {
      firmenname: c.firmenname,
      rechtsform: c.rechtsform,
      kundentyp: c.kundentyp,
      firmentyp: c.firmentyp,
      website: c.website,
      email: c.email,
      telefon: c.telefon,
      strasse: c.strasse,
      plz: c.plz,
      stadt: c.stadt,
      bundesland: c.bundesland,
      land: c.land,
      notes: c.notes,
      wasserdistanz: c.wasserdistanz,
      wassertyp: c.wassertyp,
      osm: c.osm,
      lat: c.lat,
      lon: c.lon,
    };

    const webRecencyLine =
      run.perplexityFastRecency === "month"
        ? "Recency-Filter „month“ (Schwerpunkt letzte Monate)."
        : "Recency-Filter „year“ (bis etwa ein Jahr zurück).";
    const searchLanguageLine = `Suchsprache/Region für Perplexity (searchLanguageFilter): ${run.crmSearchLocale}.`;

    const userPromptFull = `Recherchiere öffentliche Informationen zu diesem Unternehmen und fülle nur fehlende oder offensichtlich unvollständige Felder sinnvoll vor.

Kontext (CRM, JSON):
${JSON.stringify(context, null, 2)}

Anforderungen:
- Nutze perplexity_search mit bis zu ${run.perplexityFastMaxResults} Treffern; ${webRecencyLine} ${searchLanguageLine}
- Gib pro befülltem Feld confidence (low|medium|high) und mindestens eine Quelle mit echter URL aus den Suchergebnissen.
- kundentyp nur vorschlagen, wenn die Recherche eindeutig eine bessere CRM-Kategorie nahelegt; sonst null.
- wasserdistanz nur, wenn seriöse öffentliche Hinweise existieren; sonst null.
- aiSummary: max. 3 Sätze mit Quellenbezug oder null.

${buildCompanyEnrichmentClosedEnumPromptBlock()}`;

    const userPromptModelOnly = `Ohne Web-Recherche: schlage nur anhand internen Modellwissens sinnvolle Ergänzungen für offensichtlich fehlende oder unvollständige Felder vor.

Kontext (CRM, JSON):
${JSON.stringify(context, null, 2)}

Anforderungen:
- Keine Live-Web-Quellen; keine erfundenen URLs, Telefonnummern oder E-Mail-Adressen.
- sources: leer [] oder null, außer du kennst eine konkrete, sichere URL aus dem Gedächtnis — sonst keine Quellen erfinden.
- confidence konservativ (eher low/medium).
- kundentyp nur bei eindeutiger Zuordnung; sonst null.
- wasserdistanz nur bei plausiblen Hinweisen; sonst null.
- aiSummary: max. 3 Sätze oder null.

${buildCompanyEnrichmentClosedEnumPromptBlock()}`;

    const userPrompt = run.webSearchMode === "model-only" ? userPromptModelOnly : userPromptFull;

    const { result, modelUsed } = await runCompanyEnrichmentGeneration({
      system: run.webSearchMode === "model-only" ? SYSTEM_PROMPT_MODEL_ONLY : SYSTEM_PROMPT,
      userPrompt,
      addressFocusPrioritize: run.addressFocusPrioritize && run.webSearchMode === "full",
      webSearchMode: run.webSearchMode,
      gatewayModelOverride: run.gatewayModelOverride,
      signal: run.signal,
    });

    return { ok: true, data: result, modelUsed };
  } catch (err) {
    if (isEnrichmentAbortLike(err)) {
      return { ok: false, error: "ENRICHMENT_ABORTED" };
    }
    const error = mapAiEnrichmentGatewayPipelineError(err);
    return {
      ok: false,
      error,
      diagnostic: buildAiEnrichmentFailureDiagnostic(err, error),
    };
  }
}

export async function researchCompanyEnrichment(
  companyId: string,
  options?: {
    gatewayModelOverride?: ResearchCompanyEnrichmentGatewayOverride;
    webSearchMode?: CompanyEnrichmentWebSearchMode;
  },
): Promise<ResearchCompanyEnrichmentResponse> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, error: "NOT_AUTHENTICATED" };
    }

    const policy = await fetchAiEnrichmentPolicy(supabase, user.id);
    if (!policy.enabled) {
      return { ok: false, error: "AI_ENRICHMENT_DISABLED" };
    }

    if (!(await tryCommitEnrichmentSlots(supabase, user.id, 1, policy.dailyLimit))) {
      return {
        ok: false,
        error: formatAiEnrichmentDailyRateLimitError(policy.usedToday, policy.dailyLimit, 1),
      };
    }

    try {
      const gatewayModelOverrideNorm = normalizeGatewayModelOverride(options?.gatewayModelOverride);
      const webSearchMode = normalizeWebSearchMode(options?.webSearchMode);
      // Model-Only without modal override: pin structuring primary to this request's policy (same row as limit check),
      // so structuring never relies on a second policy load inside the gateway.
      const gatewayModelOverride =
        webSearchMode === "model-only" && gatewayModelOverrideNorm === undefined
          ? { primary: policy.primaryGatewayModelId }
          : gatewayModelOverrideNorm;
      const result = await runCompanyEnrichmentForActiveRow(supabase, companyId, {
        addressFocusPrioritize: policy.addressFocusPrioritize,
        gatewayModelOverride,
        webSearchMode,
        crmSearchLocale: policy.crmSearchLocale,
        perplexityFastMaxResults: policy.perplexityFastMaxResults,
        perplexityFastRecency: policy.perplexityFastRecency,
      });
      if (!result.ok) {
        await refundEnrichmentSlots(supabase, user.id, 1);
      }
      return result;
    } catch (err) {
      await refundEnrichmentSlots(supabase, user.id, 1);
      if (isEnrichmentAbortLike(err)) {
        return { ok: false, error: "ENRICHMENT_ABORTED" };
      }
      return { ok: false, error: "ENRICHMENT_FAILED" };
    }
  } catch {
    return { ok: false, error: "ENRICHMENT_FAILED" };
  }
}

export async function bulkResearchCompanyEnrichment(
  input: BulkResearchCompanyEnrichmentInput,
): Promise<BulkResearchCompanyEnrichmentResponse> {
  const parsed = bulkResearchCompanyEnrichmentInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "INVALID_INPUT" };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, error: "NOT_AUTHENTICATED" };
    }

    const policy = await fetchAiEnrichmentPolicy(supabase, user.id);
    if (!policy.enabled) {
      return { ok: false, error: "AI_ENRICHMENT_DISABLED" };
    }

    const uniqueIds = [...new Set(parsed.data.companyIds)];
    const slots = uniqueIds.length;

    if (!(await tryCommitEnrichmentSlots(supabase, user.id, slots, policy.dailyLimit))) {
      // Keep exact code for list/CSV callers that compare === "AI_ENRICHMENT_RATE_LIMIT".
      return { ok: false, error: "AI_ENRICHMENT_RATE_LIMIT" };
    }

    try {
      const settled = await Promise.allSettled(
        uniqueIds.map(async (companyId) => {
          const r = await runCompanyEnrichmentForActiveRow(supabase, companyId, {
            addressFocusPrioritize: policy.addressFocusPrioritize,
            webSearchMode: "full",
            crmSearchLocale: policy.crmSearchLocale,
            perplexityFastMaxResults: policy.perplexityFastMaxResults,
            perplexityFastRecency: policy.perplexityFastRecency,
          });
          return { companyId, r } as const;
        }),
      );

      const results: BulkCompanyEnrichmentItemResult[] = [];
      let failureSlots = 0;

      for (let i = 0; i < settled.length; i++) {
        const companyId = uniqueIds[i];
        const entry = settled[i];
        if (!entry || companyId === undefined) {
          continue;
        }
        if (entry.status === "rejected") {
          failureSlots += 1;
          results.push({ companyId, ok: false, error: "ENRICHMENT_FAILED" });
          continue;
        }
        const { r } = entry.value;
        if (r.ok) {
          results.push({ companyId, ok: true, data: r.data, modelUsed: r.modelUsed });
        } else {
          failureSlots += 1;
          results.push({
            companyId,
            ok: false,
            error: r.error,
            ...(r.diagnostic !== undefined ? { diagnostic: r.diagnostic } : {}),
          });
        }
      }

      if (failureSlots > 0) {
        await refundEnrichmentSlots(supabase, user.id, failureSlots);
      }

      return { ok: true, results };
    } catch {
      await refundEnrichmentSlots(supabase, user.id, slots);
      return { ok: false, error: "ENRICHMENT_FAILED" };
    }
  } catch {
    return { ok: false, error: "ENRICHMENT_FAILED" };
  }
}
