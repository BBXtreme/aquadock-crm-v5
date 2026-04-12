"use server";

import type { GatewayModelId } from "@ai-sdk/gateway";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveContactDetail } from "@/lib/actions/contacts";
import { runContactEnrichmentGeneration } from "@/lib/ai/company-enrichment-gateway";
import { buildAiEnrichmentFailureDiagnostic, mapAiEnrichmentGatewayPipelineError } from "@/lib/ai/enrichment-gateway-pipeline";
import { refundEnrichmentSlots, tryCommitEnrichmentSlots } from "@/lib/ai/enrichment-rate-limit";
import { ENRICHMENT_GATEWAY_MODEL_ID_CHOICES, fetchAiEnrichmentPolicy } from "@/lib/services/ai-enrichment-policy";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  type BulkResearchContactEnrichmentInput,
  bulkResearchContactEnrichmentInputSchema,
  type ContactEnrichmentResult,
} from "@/lib/validations/contact-enrichment";
import type { Database } from "@/types/database.types";

/** JSON shape for `diagnostic` — matches `EnrichmentGatewayFailureDiagnostic` in enrichment-gateway-failure-types. */
type ContactEnrichmentFailureDiagnosticPayload = {
  stableCode: string;
  httpStatus?: number;
  gatewayMessage: string;
  generationId?: string;
  tokenUsageHint?: string;
};

export type ResearchContactEnrichmentResponse =
  | { ok: true; data: ContactEnrichmentResult; modelUsed: string }
  | { ok: false; error: string; diagnostic?: ContactEnrichmentFailureDiagnosticPayload };

export type BulkContactEnrichmentItemResult =
  | { contactId: string; ok: true; data: ContactEnrichmentResult; modelUsed: string }
  | { contactId: string; ok: false; error: string; diagnostic?: ContactEnrichmentFailureDiagnosticPayload };

export type BulkResearchContactEnrichmentResponse =
  | { ok: true; results: BulkContactEnrichmentItemResult[] }
  | { ok: false; error: string };

const SYSTEM_PROMPT = `Du bist ein präziser Recherche-Assistent für AquaDock CRM (Wasser-/Hafen-/Gastronomie-Kontext).
Nutze ausschließlich öffentlich zugängliche Fakten aus den Suchergebnissen.
Erfinde keine URLs oder persönlichen Daten.
Wenn du unsicher bist, setze den betreffenden Wert auf null und erkläre kurz in rationale (optional).
Antworte strukturiert gemäß dem vorgegebenen JSON-Schema (deutsche Inhalte).`;

function formatAiEnrichmentDailyRateLimitError(
  usedToday: number,
  dailyLimit: number,
  requestedSlots: number,
): string {
  return `AI_ENRICHMENT_RATE_LIMIT:${usedToday}:${dailyLimit}:${requestedSlots}`;
}

const ALLOWED_ENRICHMENT_GATEWAY_MODELS = new Set<string>(ENRICHMENT_GATEWAY_MODEL_ID_CHOICES);

export type ResearchContactEnrichmentGatewayOverride = {
  primary?: string;
  secondary?: string;
};

function normalizeContactGatewayModelOverride(
  raw: ResearchContactEnrichmentGatewayOverride | undefined,
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

async function runContactEnrichmentForActiveRow(
  supabase: SupabaseClient<Database>,
  contactId: string,
  gatewayModelOverride?: { primary?: GatewayModelId; secondary?: GatewayModelId },
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
      gatewayModelOverride,
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

export async function researchContactEnrichment(
  contactId: string,
  options?: { gatewayModelOverride?: ResearchContactEnrichmentGatewayOverride },
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

    if (!(await tryCommitEnrichmentSlots(supabase, user.id, 1, policy.dailyLimit))) {
      return {
        ok: false,
        error: formatAiEnrichmentDailyRateLimitError(policy.usedToday, policy.dailyLimit, 1),
      };
    }

    try {
      const gatewayModelOverride = normalizeContactGatewayModelOverride(options?.gatewayModelOverride);
      const result = await runContactEnrichmentForActiveRow(supabase, contactId, gatewayModelOverride);
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

    if (!(await tryCommitEnrichmentSlots(supabase, user.id, slots, policy.dailyLimit))) {
      return { ok: false, error: "AI_ENRICHMENT_RATE_LIMIT" };
    }

    try {
      const settled = await Promise.allSettled(
        uniqueIds.map(async (contactId) => {
          const r = await runContactEnrichmentForActiveRow(supabase, contactId);
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
          results.push({
            contactId,
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
