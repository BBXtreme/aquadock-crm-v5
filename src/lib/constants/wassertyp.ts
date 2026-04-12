// src/lib/constants/wassertyp.ts
// This file defines constants and utility functions related to the "wassertyp" field used in the application.
// The `wassertypOptions` array provides predefined options for the wassertyp field, which can be used in dropdowns or forms.
// The `WASSERTYP_MAP` object maps OpenStreetMap (OSM) tags to the corresponding wassertyp values used in the app.
// The `determineWassertyp` function takes a set of OSM tags and determines the appropriate wassertyp based on the mapping, returning null if no match is found.

export const wassertypOptions = [
  { value: "Küste / Meer", label: "Küste / Meer" },
  { value: "Fluss", label: "Fluss" },
  { value: "Badesee", label: "Badesee" },
  { value: "See", label: "See" },
  { value: "Hafen", label: "Hafen" },
  { value: "Bach", label: "Bach" },
  { value: "Kanal", label: "Kanal" },
  { value: "Teich", label: "Teich" },
  { value: "Stausee", label: "Stausee" },
] as const;

/** Canonical CRM strings for `companies.wassertyp` (aligned with {@link wassertypOptions}). */
export const WASSERTYP_ALLOWED_VALUES = wassertypOptions.map((o) => o.value) as [
  string,
  ...string[],
];

export type WassertypAllowedValue = (typeof WASSERTYP_ALLOWED_VALUES)[number];

const WASSERTYP_ENRICHMENT_GLOSS: Readonly<Record<string, WassertypAllowedValue>> = {
  sea: "Küste / Meer",
  coast: "Küste / Meer",
  coastal: "Küste / Meer",
  ocean: "Küste / Meer",
  river: "Fluss",
  lake: "See",
  harbor: "Hafen",
  harbour: "Hafen",
  marina: "Hafen",
  dock: "Hafen",
  canal: "Kanal",
  stream: "Bach",
  pond: "Teich",
  reservoir: "Stausee",
  swimming: "Badesee",
};

/**
 * Maps AI or import free-text to exactly one {@link WASSERTYP_ALLOWED_VALUES} entry, or null.
 * Used by enrichment Zod + sanitize; keep in sync with CRM selects.
 */
export function normalizeWassertypForEnrichment(raw: string | null | undefined): WassertypAllowedValue | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  const t = raw.trim();
  if (t === "") {
    return null;
  }
  for (const v of WASSERTYP_ALLOWED_VALUES) {
    if (v === t) {
      return v;
    }
  }
  const lower = t.toLowerCase();
  for (const v of WASSERTYP_ALLOWED_VALUES) {
    if (v.toLowerCase() === lower) {
      return v;
    }
  }
  const collapsed = lower.replace(/\s+/g, " ").trim();
  for (const v of WASSERTYP_ALLOWED_VALUES) {
    const vl = v.toLowerCase();
    if (collapsed === vl || collapsed.includes(vl) || vl.includes(collapsed)) {
      return v;
    }
  }
  const firstToken = collapsed.split(/[/\s]+/)[0] ?? "";
  const glossHit = WASSERTYP_ENRICHMENT_GLOSS[firstToken] ?? WASSERTYP_ENRICHMENT_GLOSS[collapsed];
  if (glossHit !== undefined) {
    return glossHit;
  }
  return null;
}

/* ============================================= */
/*  WASSERTYP OSM MAPPING (refined März 2026)   */
/* ============================================= */
export const WASSERTYP_MAP: Record<string, string> = {
  // waterway
  river: "Fluss",
  stream: "Bach",
  canal: "Kanal",
  dock: "Hafen",
  harbour: "Hafen",
  marina: "Hafen",

  // natural=water + water=*
  lake: "See",
  pond: "Teich",
  reservoir: "Stausee",
  basin: "Stausee",

  // coastal / sea
  sea: "Küste / Meer",
  ocean: "Küste / Meer",
  bay: "Küste / Meer",
  beach: "Küste / Meer",

  // leisure / other water (aligned with options)
  swimming_pool: "Badesee",
  water_park: "Badesee",
};

export function determineWassertyp(tags: Record<string, string>): string | null {
  for (const value of Object.values(tags)) {
    if (WASSERTYP_MAP[value]) return WASSERTYP_MAP[value];
  }
  return null;
}
