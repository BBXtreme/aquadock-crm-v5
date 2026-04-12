// Zod schemas for AI company enrichment — strict subset checks against companySchema.shape.*.

import { z } from "zod";
import {
  normalizeFirmentypForEnrichment,
  normalizeKundentypForEnrichment,
  normalizeWassertypForEnrichment,
} from "@/lib/ai/company-enrichment-closed-enums";
import { type CompanyForm, companySchema } from "@/lib/validations/company";

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

const wasserdistanzSuggestionSchema = z
  .object({
    value: z.number().int().nonnegative().nullable().optional(),
    confidence: confidenceLevelSchema,
    sources: z.array(sourceSchema).max(5),
    rationale: rationaleSchema,
  })
  .strict();

/** Closed CRM select fields: model output is coerced to an allowed string or null before sanitize. */
function closedCrmEnumSuggestionSchema(normalize: (raw: string) => string | null) {
  return z
    .object({
      value: z
        .union([z.string(), z.null()])
        .optional()
        .transform((v): string | null => {
          if (v === undefined || v === null) {
            return null;
          }
          const s = v.trim();
          if (s === "") {
            return null;
          }
          return normalize(s);
        }),
      confidence: confidenceLevelSchema,
      sources: z.array(sourceSchema).max(5),
      rationale: rationaleSchema,
    })
    .strict();
}

const wassertypSuggestionSchema = closedCrmEnumSuggestionSchema((s) => normalizeWassertypForEnrichment(s));
const kundentypSuggestionSchema = closedCrmEnumSuggestionSchema((s) => normalizeKundentypForEnrichment(s));
const firmentypSuggestionSchema = closedCrmEnumSuggestionSchema((s) => normalizeFirmentypForEnrichment(s));

export const companyEnrichmentAiSchema = z
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
        website: stringSuggestion(500).nullable().optional(),
        email: stringSuggestion(320).nullable().optional(),
        telefon: stringSuggestion(50).nullable().optional(),
        strasse: stringSuggestion(200).nullable().optional(),
        plz: stringSuggestion(10).nullable().optional(),
        stadt: stringSuggestion(100).nullable().optional(),
        bundesland: stringSuggestion(50).nullable().optional(),
        land: stringSuggestion(50).nullable().optional(),
        notes: stringSuggestion(2000).nullable().optional(),
        wasserdistanz: wasserdistanzSuggestionSchema.nullable().optional(),
        wassertyp: wassertypSuggestionSchema.nullable().optional(),
        firmentyp: firmentypSuggestionSchema.nullable().optional(),
        kundentyp: kundentypSuggestionSchema.nullable().optional(),
      })
      .strict(),
  })
  .strict();

export type CompanyEnrichmentAiOutput = z.infer<typeof companyEnrichmentAiSchema>;

export const ENRICHMENT_FIELD_KEYS = [
  "website",
  "email",
  "telefon",
  "strasse",
  "plz",
  "stadt",
  "bundesland",
  "land",
  "notes",
  "wasserdistanz",
  "wassertyp",
  "firmentyp",
  "kundentyp",
] as const;

export type EnrichmentFieldKey = (typeof ENRICHMENT_FIELD_KEYS)[number];

export type SanitizedFieldSuggestion = {
  value: string | number | null;
  confidence: z.infer<typeof confidenceLevelSchema>;
  sources: z.infer<typeof sourceSchema>[];
  rationale: string | null;
};

export type CompanyEnrichmentResult = {
  aiSummary: string | null;
  suggestions: Partial<Record<EnrichmentFieldKey, SanitizedFieldSuggestion>>;
};

/** Trim only — do not prepend https://; CRM form accepts hostnames without forced scheme. */
function normalizeWebsite(raw: string): string {
  return raw.trim();
}

function normalizeEnrichmentClosedEnum(
  key: "wassertyp" | "kundentyp" | "firmentyp",
  raw: string,
): string | null {
  switch (key) {
    case "wassertyp":
      return normalizeWassertypForEnrichment(raw);
    case "kundentyp":
      return normalizeKundentypForEnrichment(raw);
    case "firmentyp":
      return normalizeFirmentypForEnrichment(raw);
  }
}

function validateSuggestionValue<K extends EnrichmentFieldKey>(
  key: K,
  raw: string | number | null,
): { ok: true; value: CompanyForm[K] } | { ok: false } {
  if (raw === null) {
    return { ok: false };
  }

  if (key === "wasserdistanz") {
    const parsed = companySchema.shape.wasserdistanz.safeParse(raw);
    if (!parsed.success) return { ok: false };
    return { ok: true, value: parsed.data as CompanyForm[K] };
  }

  if (key === "wassertyp" || key === "kundentyp" || key === "firmentyp") {
    if (typeof raw !== "string") {
      return { ok: false };
    }
    const normalized = normalizeEnrichmentClosedEnum(key, raw);
    if (normalized === null) {
      return { ok: false };
    }
    const parsed = companySchema.shape[key].safeParse(normalized);
    if (!parsed.success) return { ok: false };
    return { ok: true, value: parsed.data as CompanyForm[K] };
  }

  if (typeof raw !== "string") {
    return { ok: false };
  }

  const value = key === "website" ? normalizeWebsite(raw) : raw.trim();
  if (value === "") {
    return { ok: false };
  }

  const shape = companySchema.shape[key];
  const parsed = shape.safeParse(value);
  if (!parsed.success) return { ok: false };
  return { ok: true, value: parsed.data as CompanyForm[K] };
}

/**
 * Drops any suggestion that does not pass the corresponding `companySchema` field validator
 * (strict subset of company row constraints).
 * Closed CRM selects (`wassertyp`, `kundentyp`, `firmentyp`): AI schema fields use shared closed-enum transforms
 * (`company-enrichment-closed-enums`); {@link validateSuggestionValue} re-checks against `companySchema`.
 */
export const bulkResearchCompanyEnrichmentInputSchema = z
  .object({
    companyIds: z.array(z.string().uuid()).min(1).max(50),
    modelMode: z.enum(["auto", "grok_only"]).optional(),
  })
  .strict();

export type BulkResearchCompanyEnrichmentInput = z.infer<typeof bulkResearchCompanyEnrichmentInputSchema>;

export function sanitizeEnrichmentOutput(parsed: CompanyEnrichmentAiOutput): CompanyEnrichmentResult {
  const suggestions: CompanyEnrichmentResult["suggestions"] = {};
  const rawSuggestions = parsed.suggestions;

  for (const key of ENRICHMENT_FIELD_KEYS) {
    const block = rawSuggestions[key];
    if (block === null || block === undefined) continue;

    const rawValue = "value" in block ? block.value : null;
    if (rawValue === null || rawValue === undefined) continue;

    const validated = validateSuggestionValue(key, rawValue);
    if (!validated.ok) continue;

    suggestions[key] = {
      value: validated.value as string | number | null,
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
