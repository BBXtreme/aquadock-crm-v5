/**
 * CSV company import: normalization and duplicate tier logic (client + server).
 */

import type { ParsedCompanyRow } from "@/lib/utils/csv-import";
import { normalizeCsvOsmId } from "@/lib/utils/csv-import";
import type { Company } from "@/types/database.types";

export type CsvImportDuplicateTier = "osm" | "website" | "name_plz_city" | "name_only";

export type CsvImportDuplicateExisting = Pick<
  Company,
  "id" | "firmenname" | "stadt" | "plz" | "website" | "osm"
>;

export type CsvImportDbMatch = {
  tier: CsvImportDuplicateTier;
  existing: CsvImportDuplicateExisting;
};

export type CsvImportDbMatchResult = CsvImportDbMatch | null;

const TIER_SCORE: Record<CsvImportDuplicateTier, number> = {
  osm: 4,
  website: 3,
  name_plz_city: 2,
  name_only: 1,
};

export function normalizeCompanyName(value: string | undefined | null): string {
  if (value == null || typeof value !== "string") return "";
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,'"`]/g, "");
}

export function normalizePlz(value: string | undefined | null): string {
  if (value == null || typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, "");
}

export function normalizeCity(value: string | undefined | null): string {
  if (value == null || typeof value !== "string") return "";
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Returns lowercase hostname without leading "www.", or empty string if not parseable.
 */
export function normalizeWebsiteHost(value: string | undefined | null): string {
  if (value == null || typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  let urlString = trimmed;
  if (!/^https?:\/\//i.test(urlString)) {
    urlString = `https://${urlString}`;
  }
  try {
    const host = new URL(urlString).hostname.toLowerCase();
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch {
    return "";
  }
}

export function normalizedOsmFromParsedRow(row: ParsedCompanyRow): string | undefined {
  return normalizeCsvOsmId(row.osm);
}

export function normalizedHostFromParsedRow(row: ParsedCompanyRow): string {
  return normalizeWebsiteHost(row.website);
}

function normalizedNamePlzCityKey(row: ParsedCompanyRow): string | null {
  const name = normalizeCompanyName(row.firmenname);
  const plz = normalizePlz(row.plz);
  const city = normalizeCity(row.ort);
  if (!name || !plz || !city) return null;
  return `${name}|${plz}|${city}`;
}

function normalizedOsmFromCompany(c: CsvImportDuplicateExisting): string | undefined {
  return normalizeCsvOsmId(c.osm);
}

function normalizedHostFromCompany(c: CsvImportDuplicateExisting): string {
  return normalizeWebsiteHost(c.website);
}

function normalizedNamePlzCityKeyFromCompany(c: CsvImportDuplicateExisting): string | null {
  const name = normalizeCompanyName(c.firmenname);
  const plz = normalizePlz(c.plz);
  const city = normalizeCity(c.stadt);
  if (!name || !plz || !city) return null;
  return `${name}|${plz}|${city}`;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = row[0] ?? 0;
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const tmp = row[j] ?? 0;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const deletion = tmp + 1;
      const insertion = (row[j - 1] ?? 0) + 1;
      const substitute = prev + cost;
      row[j] = Math.min(deletion, insertion, substitute);
      prev = tmp;
    }
  }
  return row[b.length] ?? 0;
}

function pickBetterMatch(
  csvNameNorm: string,
  current: CsvImportDbMatch | null,
  candidate: CsvImportDbMatch,
): CsvImportDbMatch {
  if (current === null) return candidate;
  const sNew = TIER_SCORE[candidate.tier];
  const sCur = TIER_SCORE[current.tier];
  if (sNew > sCur) return candidate;
  if (sNew < sCur) return current;
  const dNew = levenshtein(csvNameNorm, normalizeCompanyName(candidate.existing.firmenname));
  const dCur = levenshtein(csvNameNorm, normalizeCompanyName(current.existing.firmenname));
  return dNew < dCur ? candidate : current;
}

/**
 * Find best DB duplicate for a CSV row from an in-memory candidate list.
 */
export function findDbDuplicateForRow(
  row: ParsedCompanyRow,
  candidates: CsvImportDuplicateExisting[],
): CsvImportDbMatch | null {
  const csvOsm = normalizedOsmFromParsedRow(row);
  const csvHost = normalizedHostFromParsedRow(row);
  const csvNpc = normalizedNamePlzCityKey(row);
  const csvName = normalizeCompanyName(row.firmenname);
  const csvPlz = normalizePlz(row.plz);
  const csvCity = normalizeCity(row.ort);
  const allowNameOnly = csvName !== "" && (csvPlz === "" || csvCity === "");

  let best: CsvImportDbMatch | null = null;

  for (const existing of candidates) {
    if (csvOsm) {
      const dbOsm = normalizedOsmFromCompany(existing);
      if (dbOsm && dbOsm === csvOsm) {
        best = pickBetterMatch(csvName, best, { tier: "osm", existing });
      }
    }
    if (csvHost) {
      const dbHost = normalizedHostFromCompany(existing);
      if (dbHost && dbHost === csvHost) {
        best = pickBetterMatch(csvName, best, { tier: "website", existing });
      }
    }
    if (csvNpc) {
      const dbNpc = normalizedNamePlzCityKeyFromCompany(existing);
      if (dbNpc && dbNpc === csvNpc) {
        best = pickBetterMatch(csvName, best, { tier: "name_plz_city", existing });
      }
    }
    if (allowNameOnly) {
      const dbName = normalizeCompanyName(existing.firmenname);
      if (dbName && dbName === csvName) {
        best = pickBetterMatch(csvName, best, { tier: "name_only", existing });
      }
    }
  }

  return best;
}

/** Dedupe key for within-file grouping (same semantics as DB high/medium keys). */
export function withinFileDedupeKey(row: ParsedCompanyRow, rowIndex: number): string {
  const osm = normalizedOsmFromParsedRow(row);
  if (osm) return `osm:${osm}`;
  const host = normalizedHostFromParsedRow(row);
  if (host) return `web:${host}`;
  const npc = normalizedNamePlzCityKey(row);
  if (npc) return `npc:${npc}`;
  const name = normalizeCompanyName(row.firmenname);
  if (name) return `name:${name}`;
  return `fallback:${String(rowIndex)}`;
}

export type CsvImportInternalDuplicateInfo = {
  firstRowIndex: number;
};

export type CsvImportDuplicateRowAnalysis = {
  rowIndex: number;
  dbMatch: CsvImportDbMatch | null;
  internalDuplicate: CsvImportInternalDuplicateInfo | null;
};

/**
 * Mark non-first rows per within-file key as internal duplicates.
 */
export function analyzeInternalDuplicates(rows: ParsedCompanyRow[]): Map<number, CsvImportInternalDuplicateInfo> {
  const firstByKey = new Map<string, number>();
  const internal = new Map<number, CsvImportInternalDuplicateInfo>();

  rows.forEach((row, index) => {
    const key = withinFileDedupeKey(row, index);
    const first = firstByKey.get(key);
    if (first === undefined) {
      firstByKey.set(key, index);
    } else {
      internal.set(index, { firstRowIndex: first });
    }
  });

  return internal;
}

export function mergeDuplicateAnalyses(
  rowCount: number,
  dbMatches: Map<number, CsvImportDbMatch | null>,
  internalMap: Map<number, CsvImportInternalDuplicateInfo>,
): CsvImportDuplicateRowAnalysis[] {
  const out: CsvImportDuplicateRowAnalysis[] = [];
  for (let i = 0; i < rowCount; i += 1) {
    out.push({
      rowIndex: i,
      dbMatch: dbMatches.get(i) ?? null,
      internalDuplicate: internalMap.get(i) ?? null,
    });
  }
  return out;
}

export function rowNeedsDuplicateReview(analysis: CsvImportDuplicateRowAnalysis): boolean {
  return analysis.dbMatch !== null || analysis.internalDuplicate !== null;
}

/** Row would be imported if user does not exclude it (duplicate rules + optional force). */
export function rowIsImportableWithForce(
  analysis: CsvImportDuplicateRowAnalysis,
  forceImportRowIndices: ReadonlySet<number>,
): boolean {
  if (!rowNeedsDuplicateReview(analysis)) {
    return true;
  }
  return forceImportRowIndices.has(analysis.rowIndex);
}

/** Rows that will be inserted given default skip for flagged duplicates, optional force set, and user exclusions. */
export function countImportableRowsWithForce(
  analyses: CsvImportDuplicateRowAnalysis[],
  forceImportRowIndices: ReadonlySet<number>,
  excludeImportRowIndices?: ReadonlySet<number>,
): number {
  const exclude = excludeImportRowIndices ?? new Set<number>();
  let n = 0;
  for (const a of analyses) {
    if (exclude.has(a.rowIndex)) {
      continue;
    }
    if (!rowNeedsDuplicateReview(a)) {
      n += 1;
    } else if (forceImportRowIndices.has(a.rowIndex)) {
      n += 1;
    }
  }
  return n;
}

const ILIKE_ESCAPES = /[%_\\]/g;

function escapeIlikePattern(value: string): string {
  return value.replace(ILIKE_ESCAPES, (ch) => `\\${ch}`);
}

/** Buckets for batched Supabase queries (RLS applies on read). */
export function collectDedupeQueryBuckets(rows: ParsedCompanyRow[]): {
  osms: string[];
  plzs: string[];
  /** Host patterns for website.ilike('%host%') */
  hosts: string[];
  /** Normalized firmennamen for rows eligible for name_only tier */
  nameOnlyNormalizedNames: string[];
} {
  const osmSet = new Set<string>();
  const plzSet = new Set<string>();
  const hostSet = new Set<string>();
  const nameOnlySet = new Set<string>();

  for (const row of rows) {
    const o = normalizedOsmFromParsedRow(row);
    if (o) osmSet.add(o);
    const p = normalizePlz(row.plz);
    if (p) plzSet.add(p);
    const h = normalizedHostFromParsedRow(row);
    if (h) hostSet.add(h);
    const n = normalizeCompanyName(row.firmenname);
    const plz = normalizePlz(row.plz);
    const city = normalizeCity(row.ort);
    if (n !== "" && (plz === "" || city === "")) {
      nameOnlySet.add(n);
    }
  }

  return {
    osms: [...osmSet],
    plzs: [...plzSet],
    hosts: [...hostSet],
    nameOnlyNormalizedNames: [...nameOnlySet],
  };
}

/** Build `website.ilike.%pattern%` OR clauses for PostgREST `.or()` */
export function buildWebsiteOrFilter(hosts: string[], maxClauses = 24): string | null {
  if (hosts.length === 0) return null;
  const parts = hosts.slice(0, maxClauses).map((h) => {
    const safe = escapeIlikePattern(h);
    return `website.ilike.%${safe}%`;
  });
  return parts.join(",");
}

/** Build `firmenname.ilike.%pattern%` OR clauses for name-only tier (bounded). */
export function buildFirmennameOrFilter(normalizedNames: string[], maxClauses = 24): string | null {
  if (normalizedNames.length === 0) return null;
  const parts = normalizedNames.slice(0, maxClauses).map((n) => {
    const safe = escapeIlikePattern(n);
    return `firmenname.ilike.%${safe}%`;
  });
  return parts.join(",");
}
