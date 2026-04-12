"use server";

import type { GatewayModelId } from "@ai-sdk/gateway";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveCompanyDetail } from "@/lib/actions/companies";
import { buildCompanyEnrichmentClosedEnumPromptBlock } from "@/lib/ai/company-enrichment-closed-enums";
import {
  type EnrichmentModelMode,
  runCompanyEnrichmentGeneration,
} from "@/lib/ai/company-enrichment-gateway";
import { buildAiEnrichmentFailureDiagnostic, mapAiEnrichmentGatewayPipelineError } from "@/lib/ai/enrichment-gateway-pipeline";
import { refundEnrichmentSlots, tryCommitEnrichmentSlots } from "@/lib/ai/enrichment-rate-limit";
import {
  type AiEnrichmentModelPreference,
  ENRICHMENT_GATEWAY_MODEL_ID_CHOICES,
  fetchAiEnrichmentPolicy,
} from "@/lib/services/ai-enrichment-policy";
import { createServerSupabaseClient } from "@/lib/supabase/server";
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

function enrichmentPreferenceToModelMode(preference: AiEnrichmentModelPreference): EnrichmentModelMode {
  if (preference === "grok") {
    return "grok_only";
  }
  if (preference === "claude" || preference === "single") {
    return "claude_only";
  }
  return "auto";
}

function mergeModalCompanyEnrichmentModelMode(
  preference: AiEnrichmentModelPreference,
  modal: EnrichmentModelMode,
): EnrichmentModelMode {
  if (modal === "grok_only") {
    return "grok_only";
  }
  return enrichmentPreferenceToModelMode(preference);
}

function mergeBulkCompanyEnrichmentModelMode(
  preference: AiEnrichmentModelPreference,
  bulk: EnrichmentModelMode | undefined,
): EnrichmentModelMode {
  if (bulk === "grok_only") {
    return "grok_only";
  }
  return enrichmentPreferenceToModelMode(preference);
}

function formatAiEnrichmentDailyRateLimitError(
  usedToday: number,
  dailyLimit: number,
  requestedSlots: number,
): string {
  return `AI_ENRICHMENT_RATE_LIMIT:${usedToday}:${dailyLimit}:${requestedSlots}`;
}

const ALLOWED_ENRICHMENT_GATEWAY_MODELS = new Set<string>(ENRICHMENT_GATEWAY_MODEL_ID_CHOICES);

export type ResearchCompanyEnrichmentGatewayOverride = {
  primary?: string;
  secondary?: string;
};

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

async function runCompanyEnrichmentForActiveRow(
  supabase: SupabaseClient<Database>,
  companyId: string,
  run: {
    modelMode: EnrichmentModelMode;
    addressFocusPrioritize: boolean;
    gatewayModelOverride?: { primary?: GatewayModelId; secondary?: GatewayModelId };
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

    const userPrompt = `Recherchiere öffentliche Informationen zu diesem Unternehmen und fülle nur fehlende oder offensichtlich unvollständige Felder sinnvoll vor.

Kontext (CRM, JSON):
${JSON.stringify(context, null, 2)}

Anforderungen:
- Nutze perplexity_search, um aktuelle Web-Quellen zu finden (DE-Schwerpunkt).
- Gib pro befülltem Feld confidence (low|medium|high) und mindestens eine Quelle mit echter URL aus den Suchergebnissen.
- kundentyp nur vorschlagen, wenn die Recherche eindeutig eine bessere CRM-Kategorie nahelegt; sonst null.
- wasserdistanz nur, wenn seriöse öffentliche Hinweise existieren; sonst null.
- aiSummary: max. 3 Sätze mit Quellenbezug oder null.

${buildCompanyEnrichmentClosedEnumPromptBlock()}`;

    const { result, modelUsed } = await runCompanyEnrichmentGeneration({
      system: SYSTEM_PROMPT,
      userPrompt,
      modelMode: run.modelMode,
      addressFocusPrioritize: run.addressFocusPrioritize,
      gatewayModelOverride: run.gatewayModelOverride,
    });

    return { ok: true, data: result, modelUsed };
  } catch (err) {
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
  options?: { modelMode?: EnrichmentModelMode; gatewayModelOverride?: ResearchCompanyEnrichmentGatewayOverride },
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
      const modalMode = options?.modelMode ?? "auto";
      const effectiveModelMode = mergeModalCompanyEnrichmentModelMode(policy.modelPreference, modalMode);
      const gatewayModelOverride = normalizeGatewayModelOverride(options?.gatewayModelOverride);
      const result = await runCompanyEnrichmentForActiveRow(supabase, companyId, {
        modelMode: effectiveModelMode,
        addressFocusPrioritize: policy.addressFocusPrioritize,
        gatewayModelOverride,
      });
      if (!result.ok) {
        await refundEnrichmentSlots(supabase, user.id, 1);
      }
      return result;
    } catch {
      await refundEnrichmentSlots(supabase, user.id, 1);
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
      const effectiveModelMode = mergeBulkCompanyEnrichmentModelMode(
        policy.modelPreference,
        parsed.data.modelMode,
      );
      const settled = await Promise.allSettled(
        uniqueIds.map(async (companyId) => {
          const r = await runCompanyEnrichmentForActiveRow(supabase, companyId, {
            modelMode: effectiveModelMode,
            addressFocusPrioritize: policy.addressFocusPrioritize,
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
