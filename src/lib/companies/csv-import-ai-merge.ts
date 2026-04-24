/**
 * Merge AI enrichment suggestions into CSV preview rows (fill empty fields only).
 */

import type { ParsedCompanyRow } from "@/lib/utils/csv-import";
import {
  type CompanyEnrichmentResult,
  ENRICHMENT_FIELD_KEYS,
} from "@/lib/validations/company-enrichment";

function isEmptyOptionalString(value: string | undefined): boolean {
  return value === undefined || value.trim() === "";
}

const MERGE_COMPARED_KEYS: (keyof ParsedCompanyRow)[] = [
  "website",
  "email",
  "telefon",
  "strasse",
  "plz",
  "ort",
  "bundesland",
  "land",
  "wasser_distanz",
  "wassertyp",
  "kundentyp",
];

function fieldEqual(a: ParsedCompanyRow[keyof ParsedCompanyRow], b: ParsedCompanyRow[keyof ParsedCompanyRow]): boolean {
  if (a === b) {
    return true;
  }
  if (typeof a === "number" && typeof b === "number") {
    return a === b;
  }
  const sa = a === undefined || a === null ? "" : String(a);
  const sb = b === undefined || b === null ? "" : String(b);
  return sa === sb;
}

/** How many preview fields would change after merge (empty cells filled only). */
export function countEffectiveAiMergeFields(row: ParsedCompanyRow, result: CompanyEnrichmentResult): number {
  const after = mergeAiEnrichmentIntoParsedRow(row, result);
  let n = 0;
  for (const k of MERGE_COMPARED_KEYS) {
    if (!fieldEqual(row[k], after[k])) {
      n += 1;
    }
  }
  return n;
}

export function mergeAiEnrichmentIntoParsedRow(
  row: ParsedCompanyRow,
  result: CompanyEnrichmentResult,
): ParsedCompanyRow {
  const next: ParsedCompanyRow = { ...row };

  for (const key of ENRICHMENT_FIELD_KEYS) {
    const sug = result.suggestions[key];
    if (sug === undefined || sug.value === null || sug.value === undefined) {
      continue;
    }

    switch (key) {
      case "website":
        if (isEmptyOptionalString(next.website)) {
          next.website = String(sug.value);
        }
        break;
      case "email":
        if (isEmptyOptionalString(next.email)) {
          next.email = String(sug.value);
        }
        break;
      case "telefon":
        if (isEmptyOptionalString(next.telefon)) {
          next.telefon = String(sug.value);
        }
        break;
      case "strasse":
        if (isEmptyOptionalString(next.strasse)) {
          next.strasse = String(sug.value);
        }
        break;
      case "plz":
        if (isEmptyOptionalString(next.plz)) {
          next.plz = String(sug.value);
        }
        break;
      case "stadt":
        if (isEmptyOptionalString(next.ort)) {
          next.ort = String(sug.value);
        }
        break;
      case "bundesland":
        if (isEmptyOptionalString(next.bundesland)) {
          next.bundesland = String(sug.value);
        }
        break;
      case "land":
        if (isEmptyOptionalString(next.land)) {
          next.land = String(sug.value);
        }
        break;
      case "notes":
        break;
      case "wasserdistanz":
        if (next.wasser_distanz === undefined && typeof sug.value === "number") {
          next.wasser_distanz = sug.value;
        }
        break;
      case "wassertyp":
        if (isEmptyOptionalString(next.wassertyp)) {
          next.wassertyp = String(sug.value);
        }
        break;
      case "firmentyp":
        break;
      case "kundentyp":
        if (isEmptyOptionalString(next.kundentyp)) {
          next.kundentyp = String(sug.value);
        }
        break;
      default: {
        const _exhaustive: never = key;
        return _exhaustive;
      }
    }
  }

  return next;
}
