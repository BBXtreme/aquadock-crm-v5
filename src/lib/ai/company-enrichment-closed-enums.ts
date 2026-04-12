// Closed CRM select values for company AI enrichment — prompt lines + normalization (keep in sync with forms).

import {
  FIRMENTYP_ALLOWED_VALUES,
  firmentypOptions,
  KUNDENTYP_ALLOWED_VALUES,
  kundentypOptions,
} from "@/lib/constants/company-options";
import { WASSERTYP_ALLOWED_VALUES } from "@/lib/constants/wassertyp";

function buildLabelValueLookup(options: readonly { value: string; label: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const o of options) {
    out[o.value.toLowerCase()] = o.value;
    out[o.label.toLowerCase()] = o.value;
  }
  return out;
}

const KUNDENTYP_LABEL_LOOKUP = buildLabelValueLookup(kundentypOptions);

const FIRMENTYP_LABEL_LOOKUP: Record<string, string> = {
  ...buildLabelValueLookup(firmentypOptions),
  chain: "kette",
  kette: "kette",
  single: "einzeln",
  einzeln: "einzeln",
  independent: "einzeln",
  standalone: "einzeln",
};

/**
 * Maps free text to one allowed CRM string, or null.
 * Uses exact match, case-insensitive value match, optional label/synonym lookup, then conservative substring match (min length 4).
 */
export function normalizeAgainstAllowedList(
  raw: string,
  allowed: readonly string[],
  labelOrSynonymToValue?: Readonly<Record<string, string>>,
): string | null {
  const t = raw.trim();
  if (t === "") {
    return null;
  }
  for (const v of allowed) {
    if (v === t) {
      return v;
    }
  }
  const lower = t.toLowerCase();
  for (const v of allowed) {
    if (v.toLowerCase() === lower) {
      return v;
    }
  }
  if (labelOrSynonymToValue) {
    const mapped = labelOrSynonymToValue[lower] ?? labelOrSynonymToValue[t];
    if (mapped !== undefined) {
      for (const v of allowed) {
        if (v === mapped) {
          return v;
        }
      }
    }
  }
  const collapsed = lower.replace(/\s+/g, " ").trim();
  for (const v of allowed) {
    const vl = v.toLowerCase();
    if (collapsed === vl) {
      return v;
    }
    if (collapsed.length >= 4 && vl.length >= 4 && (collapsed.includes(vl) || vl.includes(collapsed))) {
      return v;
    }
  }
  return null;
}

export function normalizeKundentypForEnrichment(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  return normalizeAgainstAllowedList(raw, KUNDENTYP_ALLOWED_VALUES, KUNDENTYP_LABEL_LOOKUP);
}

export function normalizeFirmentypForEnrichment(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  return normalizeAgainstAllowedList(raw, FIRMENTYP_ALLOWED_VALUES, FIRMENTYP_LABEL_LOOKUP);
}

export { normalizeWassertypForEnrichment } from "@/lib/constants/wassertyp";

function buildEnrichmentClosedStringEnumPromptLine(fieldLabel: string, allowedValues: readonly string[]): string {
  const quoted = allowedValues.map((v) => JSON.stringify(v)).join(", ");
  return `${fieldLabel}: exakt einer von ${quoted} oder null — kein Freitext.`;
}

/**
 * One compact block for the enrichment model (system / user append). Add new closed fields here only.
 */
export function buildCompanyEnrichmentClosedEnumPromptBlock(): string {
  const lines = [
    buildEnrichmentClosedStringEnumPromptLine("kundentyp", KUNDENTYP_ALLOWED_VALUES),
    buildEnrichmentClosedStringEnumPromptLine("firmentyp", FIRMENTYP_ALLOWED_VALUES),
    buildEnrichmentClosedStringEnumPromptLine("wassertyp", WASSERTYP_ALLOWED_VALUES),
  ];
  return `\n\nGeschlossene CRM-Select-Felder — für jedes Feld MUSS der Vorschlagswert genau einer der genannten Strings oder null sein:\n${lines.map((l) => `- ${l}`).join("\n")}`;
}
