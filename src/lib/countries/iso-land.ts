/**
 * Canonical ISO 3166-1 alpha-2 handling for `companies.land`.
 * Server- and client-safe: no next-intl import; pass routing locale into display helpers.
 */

/** Stored DB value: uppercase ISO 3166-1 alpha-2 (e.g. DE, HR). */
export type Iso3166Alpha2 = string;

export type NormalizeLandInputOk = { ok: true; code: Iso3166Alpha2 };

export type NormalizeLandInputFail = { ok: false };

export type NormalizeLandInputResult = NormalizeLandInputOk | NormalizeLandInputFail;

/** Assigned-region validation (Unicode CLDR via Intl). */
export const ISO3166_ALPHA2_REGEX = /^[A-Z]{2}$/;

/**
 * Bootstrap ISO codes always offered in land `<Select>` when `DISTINCT companies.land`
 * is empty or missing a default.
 */
export const DEFAULT_COMPANY_LAND_CODES: readonly string[] = ["DE"];

/**
 * Radix `<Select.Item>` must not use `value=""` (empty string clears selection). Use this value for
 * “no country” in land selects and map it to `null` in form state / Zod.
 */
export const LAND_SELECT_CLEAR_SENTINEL = "__land_none__" as const;

const REGION_INDICATOR_A = 0x1f1e6;
const ASCII_UPPER_A = 0x41;

/**
 * Synonyms and legacy CRM labels (German UI strings) → ISO alpha-2.
 * Keys must be lowercase ASCII for lookup.
 */
const SYNONYM_TO_ISO: Record<string, Iso3166Alpha2> = {
  // ISO-like / OSM-style short codes already uppercase in data — handled via alpha-2 branch
  deutschland: "DE",
  germany: "DE",
  österreich: "AT",
  osterreich: "AT",
  austria: "AT",
  schweiz: "CH",
  switzerland: "CH",
  frankreich: "FR",
  france: "FR",
  italien: "IT",
  italy: "IT",
  italija: "IT",
  spanien: "ES",
  spain: "ES",
  niederlande: "NL",
  niederlanden: "NL",
  netherlands: "NL",
  holland: "NL",
  belgien: "BE",
  belgium: "BE",
  belgique: "BE",
  dänemark: "DK",
  danemark: "DK",
  denmark: "DK",
  schweden: "SE",
  sweden: "SE",
  norwegen: "NO",
  norway: "NO",
  polen: "PL",
  poland: "PL",
  ungarn: "HU",
  hungary: "HU",
  griechenland: "GR",
  greece: "GR",
  ellada: "GR",
  portugal: "PT",
  großbritannien: "GB",
  grossbritannien: "GB",
  "vereinigtes königreich": "GB",
  "vereinigtes konigreich": "GB",
  "united kingdom": "GB",
  "great britain": "GB",
  uk: "GB",
  gb: "GB",
  kroatien: "HR",
  croatia: "HR",
  hrvatska: "HR",
  hr: "HR",
};

function trimOrEmpty(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  return value.trim();
}

function isAssignedRegion(code: string): boolean {
  if (!ISO3166_ALPHA2_REGEX.test(code)) {
    return false;
  }
  try {
    const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
    const label = displayNames.of(code);
    return label !== undefined && label !== code;
  } catch {
    return false;
  }
}

/**
 * True when `value` is exactly two ASCII letters AND resolves as an assigned ISO region.
 */
export function isIso3166Alpha2(value: string): boolean {
  const upper = value.toUpperCase();
  return isAssignedRegion(upper);
}

/**
 * Normalize free-text country input to ISO alpha-2 for persistence.
 * Accepts legacy German CRM labels, common English names, and valid ISO codes.
 */
export function normalizeLandInput(raw: string | null | undefined): NormalizeLandInputResult {
  const trimmed = trimOrEmpty(raw);
  if (trimmed.length === 0) {
    return { ok: false };
  }

  const collapsed = trimmed.replace(/\s+/g, " ").trim();
  const synonymKey = collapsed.toLowerCase();
  const fromSynonym = SYNONYM_TO_ISO[synonymKey];
  if (fromSynonym !== undefined && isAssignedRegion(fromSynonym)) {
    return { ok: true, code: fromSynonym };
  }

  const compactLettersOnly = collapsed.replace(/[^a-zA-Z]/g, "");
  if (compactLettersOnly.length === 2) {
    const upper = compactLettersOnly.toUpperCase();
    if (isAssignedRegion(upper)) {
      return { ok: true, code: upper };
    }
  }

  return { ok: false };
}

/**
 * Locale-aware region label (CLDR). `locale` should match next-intl (e.g. de, en, hr).
 */
export function getLandRegionDisplayName(code: string, locale: string): string {
  const trimmed = trimOrEmpty(code);
  if (trimmed.length === 0) {
    return "";
  }
  const upper = trimmed.toUpperCase();
  if (!ISO3166_ALPHA2_REGEX.test(upper)) {
    return trimmed;
  }
  try {
    const displayNames = new Intl.DisplayNames([locale], { type: "region" });
    const label = displayNames.of(upper);
    if (label !== undefined && label !== upper) {
      return label;
    }
  } catch {
    // fall through
  }
  return upper;
}

/**
 * Options for company land `<Select>`: bootstrap + distinct DB codes + current row code.
 */
export function buildCompanyLandSelectOptions(params: {
  distinctLandCodes: readonly string[];
  locale: string;
  currentLandCode?: string | null;
}): { value: string; label: string }[] {
  const merged = new Set<string>(DEFAULT_COMPANY_LAND_CODES);
  for (const code of params.distinctLandCodes) {
    merged.add(code);
  }
  const current = params.currentLandCode?.trim();
  if (current !== undefined && current !== "") {
    merged.add(current);
  }
  const sorted = [...merged].sort((a, b) => a.localeCompare(b));
  return sorted.map((code) => ({
    value: code,
    label: getLandRegionDisplayName(code, params.locale),
  }));
}

/**
 * Regional-indicator emoji from ISO alpha-2, or null when missing/invalid.
 */
export function getLandFlagEmoji(code: string | null | undefined): string | null {
  const trimmed = trimOrEmpty(code);
  if (trimmed.length === 0) {
    return null;
  }
  const upper = trimmed.toUpperCase();
  if (!ISO3166_ALPHA2_REGEX.test(upper)) {
    return null;
  }
  const first = upper.codePointAt(0);
  const second = upper.codePointAt(1);
  if (first === undefined || second === undefined) {
    return null;
  }
  if (first < ASCII_UPPER_A || first > ASCII_UPPER_A + 25) {
    return null;
  }
  if (second < ASCII_UPPER_A || second > ASCII_UPPER_A + 25) {
    return null;
  }
  const r1 = REGION_INDICATOR_A + (first - ASCII_UPPER_A);
  const r2 = REGION_INDICATOR_A + (second - ASCII_UPPER_A);
  return String.fromCodePoint(r1, r2);
}
