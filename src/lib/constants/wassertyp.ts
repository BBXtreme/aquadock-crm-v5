// src/lib/constants/wassertyp.ts
// Water type options + OSM mapping for determineWassertyp

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
];

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
