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
