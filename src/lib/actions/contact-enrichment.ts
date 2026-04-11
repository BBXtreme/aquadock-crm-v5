"use server";

import { resolveContactDetail } from "@/lib/actions/contacts";
import {
  type EnrichmentModelMode,
  runContactEnrichmentGeneration,
} from "@/lib/ai/company-enrichment-gateway";
import { refundEnrichmentSlots, tryCommitEnrichmentSlots } from "@/lib/ai/enrichment-rate-limit";
import { fetchAiEnrichmentPolicy } from "@/lib/services/ai-enrichment-policy";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ContactEnrichmentResult } from "@/lib/validations/contact-enrichment";

export type ResearchContactEnrichmentResponse =
  | { ok: true; data: ContactEnrichmentResult; modelUsed: string }
  | { ok: false; error: string };

const SYSTEM_PROMPT = `Du bist ein präziser Recherche-Assistent für AquaDock CRM (Wasser-/Hafen-/Gastronomie-Kontext).
Nutze ausschließlich öffentlich zugängliche Fakten aus den Suchergebnissen.
Erfinde keine URLs oder persönlichen Daten.
Wenn du unsicher bist, setze den betreffenden Wert auf null und erkläre kurz in rationale (optional).
Antworte strukturiert gemäß dem vorgegebenen JSON-Schema (deutsche Inhalte).`;

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
      const resolved = await resolveContactDetail(contactId, supabase);
      if (resolved.kind !== "active") {
        refundEnrichmentSlots(user.id, 1);
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
          refundEnrichmentSlots(user.id, 1);
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
        modelMode: options?.modelMode,
      });

      return { ok: true, data: result, modelUsed };
    } catch (err) {
      refundEnrichmentSlots(user.id, 1);
      if (err instanceof Error && err.message === "AI_GATEWAY_MISSING") {
        return { ok: false, error: "AI_GATEWAY_MISSING" };
      }
      return { ok: false, error: "ENRICHMENT_FAILED" };
    }
  } catch {
    return { ok: false, error: "ENRICHMENT_FAILED" };
  }
}
