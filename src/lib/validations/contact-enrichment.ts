// Zod schemas for AI contact enrichment — strict subset of contact public fields.

import { z } from "zod";
import { type ContactFormValues, contactSchema } from "@/lib/validations/contact";

function emptyStringToNull(val: string | null | undefined): string | null | undefined {
  return val === "" ? null : val;
}

const confidenceLevelSchema = z.enum(["low", "medium", "high"]);

const sourceSchema = z
  .object({
    title: z.string().trim().min(1, "Titel ist erforderlich"),
    url: z.string().trim().url("Ungültige Quell-URL"),
  })
  .strict();

const rationaleSchema = z
  .string()
  .trim()
  .max(500)
  .nullable()
  .optional()
  .transform(emptyStringToNull);

function stringSuggestion(max: number) {
  return z
    .object({
      value: z
        .string()
        .trim()
        .max(max)
        .nullable()
        .optional()
        .transform(emptyStringToNull),
      confidence: confidenceLevelSchema,
      sources: z.array(sourceSchema).max(5),
      rationale: rationaleSchema,
    })
    .strict();
}

export const contactEnrichmentAiSchema = z
  .object({
    aiSummary: z
      .string()
      .trim()
      .max(800)
      .nullable()
      .optional()
      .transform(emptyStringToNull),
    suggestions: z
      .object({
        email: stringSuggestion(320).nullable().optional(),
        telefon: stringSuggestion(50).nullable().optional(),
        position: stringSuggestion(100).nullable().optional(),
        notes: stringSuggestion(2000).nullable().optional(),
      })
      .strict(),
  })
  .strict();

export type ContactEnrichmentAiOutput = z.infer<typeof contactEnrichmentAiSchema>;

export const CONTACT_ENRICHMENT_FIELD_KEYS = ["email", "telefon", "position", "notes"] as const;

export type ContactEnrichmentFieldKey = (typeof CONTACT_ENRICHMENT_FIELD_KEYS)[number];

export type ContactSanitizedFieldSuggestion = {
  value: string | null;
  confidence: z.infer<typeof confidenceLevelSchema>;
  sources: z.infer<typeof sourceSchema>[];
  rationale: string | null;
};

type ContactEnrichmentValue = NonNullable<ContactFormValues[ContactEnrichmentFieldKey]>;

export type ContactEnrichmentResult = {
  aiSummary: string | null;
  suggestions: Partial<Record<ContactEnrichmentFieldKey, ContactSanitizedFieldSuggestion>>;
};

function validateContactSuggestionValue(
  key: ContactEnrichmentFieldKey,
  raw: string | null,
): { ok: true; value: ContactEnrichmentValue } | { ok: false } {
  if (raw === null) {
    return { ok: false };
  }
  const value = raw.trim();
  if (value === "") {
    return { ok: false };
  }
  const fieldSchema = contactSchema.shape[key];
  const parsed = fieldSchema.safeParse(value);
  if (!parsed.success) return { ok: false };
  const data = parsed.data;
  if (data === null || data === undefined) {
    return { ok: false };
  }
  return { ok: true, value: data as ContactEnrichmentValue };
}

export const bulkResearchContactEnrichmentInputSchema = z
  .object({
    contactIds: z.array(z.string().uuid()).min(1).max(50),
  })
  .strict();

export type BulkResearchContactEnrichmentInput = z.infer<typeof bulkResearchContactEnrichmentInputSchema>;

export function sanitizeContactEnrichmentOutput(parsed: ContactEnrichmentAiOutput): ContactEnrichmentResult {
  const suggestions: ContactEnrichmentResult["suggestions"] = {};
  const rawSuggestions = parsed.suggestions;

  for (const key of CONTACT_ENRICHMENT_FIELD_KEYS) {
    const block = rawSuggestions[key];
    if (block === null || block === undefined) continue;
    const rawValue = block.value;
    if (rawValue === null || rawValue === undefined) continue;
    const validated = validateContactSuggestionValue(key, rawValue);
    if (!validated.ok) continue;
    suggestions[key] = {
      value: validated.value,
      confidence: block.confidence,
      sources: block.sources,
      rationale: block.rationale ?? null,
    };
  }

  return {
    aiSummary: parsed.aiSummary ?? null,
    suggestions,
  };
}
