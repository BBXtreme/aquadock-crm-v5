"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveContactDetail } from "@/lib/actions/contacts";
import {
  type EnrichmentModelMode,
  runContactEnrichmentGeneration,
} from "@/lib/ai/company-enrichment-gateway";
import { refundEnrichmentSlots, tryCommitEnrichmentSlots } from "@/lib/ai/enrichment-rate-limit";
import {
  type AiEnrichmentModelPreference,
  fetchAiEnrichmentPolicy,
} from "@/lib/services/ai-enrichment-policy";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  type BulkResearchContactEnrichmentInput,
  bulkResearchContactEnrichmentInputSchema,
  type ContactEnrichmentResult,
} from "@/lib/validations/contact-enrichment";
import type { Database } from "@/types/database.types";

export type ResearchContactEnrichmentResponse =
  | { ok: true; data: ContactEnrichmentResult; modelUsed: string }
  | { ok: false; error: string };

export type BulkContactEnrichmentItemResult =
  | { contactId: string; ok: true; data: ContactEnrichmentResult; modelUsed: string }
  | { contactId: string; ok: false; error: string };

export type BulkResearchContactEnrichmentResponse =
  | { ok: true; results: BulkContactEnrichmentItemResult[] }
  | { ok: false; error: string };

const SYSTEM_PROMPT = `Du bist ein präziser Recherche-Assistent für AquaDock CRM (Wasser-/Hafen-/Gastronomie-Kontext).
Nutze ausschließlich öffentlich zugängliche Fakten aus den Suchergebnissen.
Erfinde keine URLs oder persönlichen Daten.
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

function mergeModalContactEnrichmentModelMode(
  preference: AiEnrichmentModelPreference,
  modal: EnrichmentModelMode,
): EnrichmentModelMode {
  if (modal === "grok_only") {
    return "grok_only";
  }
  return enrichmentPreferenceToModelMode(preference);
}

function mergeBulkContactEnrichmentModelMode(
  preference: AiEnrichmentModelPreference,
  bulk: EnrichmentModelMode | undefined,
): EnrichmentModelMode {
  if (bulk === "grok_only") {
    return "grok_only";
  }
  return enrichmentPreferenceToModelMode(preference);
}

async function runContactEnrichmentForActiveRow(
  supabase: SupabaseClient<Database>,
  contactId: string,
  modelMode: EnrichmentModelMode,
): Promise<ResearchContactEnrichmentResponse> {
  try {
    const resolved = await resolveContactDetail(contactId, supabase);
    if (resolved.kind !== "active") {
      return { ok: false, error: "CONTACT_NOT_FOUND" };
    }

    const ct = resolved.contact;
    let firmenname: string | null = null;
    if (ct.company_id) {
      const { data: companyRow, error: companyError } = await supabase
        .from("companies")
        .select("firmenname")
        .eq("id", ct.company_id)
        .is("deleted_at", null)
        .maybeSingle();

      if (companyError) {
        return { ok: false, error: "ENRICHMENT_FAILED" };
      }
      firmenname = companyRow?.firmenname ?? null;
    }

    const context = {
      vorname: ct.vorname,
      nachname: ct.nachname,
      company_id: ct.company_id,
      firmenname,
      position: ct.position,
      email: ct.email,
      telefon: ct.telefon,
      notes: ct.notes,
    };

    const userPrompt = `Recherchiere öffentliche Informationen zu diesem Kontakt (Person im beruflichen Kontext) und schlage nur sinnvolle Ergänzungen für die erlaubten Felder vor.

Kontext (CRM, JSON):
${JSON.stringify(context, null, 2)}

Anforderungen:
- Nutze perplexity_search mit DE-Schwerpunkt.
- Gib pro befülltem Feld confidence (low|medium|high) und mindestens eine Quelle mit echter URL aus den Suchergebnissen.
- Keine privaten Daten erfinden; nur öffentliche berufliche Profile / Presse / Unternehmensseiten.
- aiSummary: max. 3 Sätze mit Quellenbezug oder null.`;

    const { result, modelUsed } = await runContactEnrichmentGeneration({
      system: SYSTEM_PROMPT,
      userPrompt,
      modelMode,
    });

    return { ok: true, data: result, modelUsed };
  } catch (err) {
    if (err instanceof Error && err.message === "AI_GATEWAY_MISSING") {
      return { ok: false, error: "AI_GATEWAY_MISSING" };
    }
    return { ok: false, error: "ENRICHMENT_FAILED" };
  }
}

export async function researchContactEnrichment(
  contactId: string,
  options?: { modelMode?: EnrichmentModelMode },
): Promise<ResearchContactEnrichmentResponse> {
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
      const effective = mergeModalContactEnrichmentModelMode(policy.modelPreference, modalMode);
      const result = await runContactEnrichmentForActiveRow(supabase, contactId, effective);
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

export async function bulkResearchContactEnrichment(
  input: BulkResearchContactEnrichmentInput,
): Promise<BulkResearchContactEnrichmentResponse> {
  const parsed = bulkResearchContactEnrichmentInputSchema.safeParse(input);
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

    const uniqueIds = [...new Set(parsed.data.contactIds)];
    const slots = uniqueIds.length;

    if (!tryCommitEnrichmentSlots(user.id, slots, policy.dailyLimit)) {
      return { ok: false, error: "AI_ENRICHMENT_RATE_LIMIT" };
    }

    try {
      const effectiveModelMode = mergeBulkContactEnrichmentModelMode(
        policy.modelPreference,
        parsed.data.modelMode,
      );
      const settled = await Promise.allSettled(
        uniqueIds.map(async (contactId) => {
          const r = await runContactEnrichmentForActiveRow(supabase, contactId, effectiveModelMode);
          return { contactId, r } as const;
        }),
      );

      const results: BulkContactEnrichmentItemResult[] = [];
      let failureSlots = 0;

      for (let i = 0; i < settled.length; i++) {
        const contactId = uniqueIds[i];
        const entry = settled[i];
        if (!entry || contactId === undefined) {
          continue;
        }
        if (entry.status === "rejected") {
          failureSlots += 1;
          results.push({ contactId, ok: false, error: "ENRICHMENT_FAILED" });
          continue;
        }
        const { r } = entry.value;
        if (r.ok) {
          results.push({ contactId, ok: true, data: r.data, modelUsed: r.modelUsed });
        } else {
          failureSlots += 1;
          results.push({ contactId, ok: false, error: r.error });
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
