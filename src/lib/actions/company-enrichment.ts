"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveCompanyDetail } from "@/lib/actions/companies";
import {
  type EnrichmentModelMode,
  runCompanyEnrichmentGeneration,
} from "@/lib/ai/company-enrichment-gateway";
import { refundEnrichmentSlots, tryCommitEnrichmentSlots } from "@/lib/ai/enrichment-rate-limit";
import {
  type AiEnrichmentModelPreference,
  fetchAiEnrichmentPolicy,
} from "@/lib/services/ai-enrichment-policy";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  type BulkResearchCompanyEnrichmentInput,
  bulkResearchCompanyEnrichmentInputSchema,
  type CompanyEnrichmentResult,
} from "@/lib/validations/company-enrichment";
import type { Database } from "@/types/database.types";

export type ResearchCompanyEnrichmentResponse =
  | { ok: true; data: CompanyEnrichmentResult; modelUsed: string }
  | { ok: false; error: string };

export type BulkCompanyEnrichmentItemResult =
  | { companyId: string; ok: true; data: CompanyEnrichmentResult; modelUsed: string }
  | { companyId: string; ok: false; error: string };

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
  if (preference === "claude") {
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

async function runCompanyEnrichmentForActiveRow(
  supabase: SupabaseClient<Database>,
  companyId: string,
  run: { modelMode: EnrichmentModelMode; addressFocusPrioritize: boolean },
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
- aiSummary: max. 3 Sätze mit Quellenbezug oder null.`;

    const { result, modelUsed } = await runCompanyEnrichmentGeneration({
      system: SYSTEM_PROMPT,
      userPrompt,
      modelMode: run.modelMode,
      addressFocusPrioritize: run.addressFocusPrioritize,
    });

    return { ok: true, data: result, modelUsed };
  } catch (err) {
    if (err instanceof Error && err.message === "AI_GATEWAY_MISSING") {
      return { ok: false, error: "AI_GATEWAY_MISSING" };
    }
    return { ok: false, error: "ENRICHMENT_FAILED" };
  }
}

export async function researchCompanyEnrichment(
  companyId: string,
  options?: { modelMode?: EnrichmentModelMode },
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

    if (!tryCommitEnrichmentSlots(user.id, 1, policy.dailyLimit)) {
      return { ok: false, error: "AI_ENRICHMENT_RATE_LIMIT" };
    }

    try {
      const modalMode = options?.modelMode ?? "auto";
      const effectiveModelMode = mergeModalCompanyEnrichmentModelMode(policy.modelPreference, modalMode);
      const result = await runCompanyEnrichmentForActiveRow(supabase, companyId, {
        modelMode: effectiveModelMode,
        addressFocusPrioritize: policy.addressFocusPrioritize,
      });
      if (!result.ok) {
        refundEnrichmentSlots(user.id, 1);
      }
      return result;
    } catch {
      refundEnrichmentSlots(user.id, 1);
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

    if (!tryCommitEnrichmentSlots(user.id, slots, policy.dailyLimit)) {
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
          results.push({ companyId, ok: false, error: r.error });
        }
      }

      if (failureSlots > 0) {
        refundEnrichmentSlots(user.id, failureSlots);
      }

      return { ok: true, results };
    } catch {
      refundEnrichmentSlots(user.id, slots);
      return { ok: false, error: "ENRICHMENT_FAILED" };
    }
  } catch {
    return { ok: false, error: "ENRICHMENT_FAILED" };
  }
}
