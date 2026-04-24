import type { Company } from "@/types/database.types";

export const GEOCODE_BATCH_MAX = 50;

export const WATER_PRESETS = [
  { value: "at", labelKey: "waterAtWater" },
  { value: "le100", labelKey: "waterLe100" },
  { value: "le500", labelKey: "waterLe500" },
  { value: "le1km", labelKey: "waterLe1km" },
  { value: "gt1km", labelKey: "waterGt1km" },
] as const;

export type WaterPreset = (typeof WATER_PRESETS)[number]["value"];

export function companyNeedsGeocode(company: Company): boolean {
  const hasLat = typeof company.lat === "number" && Number.isFinite(company.lat);
  const hasLon = typeof company.lon === "number" && Number.isFinite(company.lon);
  const lat = company.lat;
  const lon = company.lon;
  const coordsOk =
    hasLat &&
    hasLon &&
    typeof lat === "number" &&
    typeof lon === "number" &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180;
  if (coordsOk) {
    return false;
  }
  const stadt = (company.stadt ?? "").trim();
  const strasse = (company.strasse ?? "").trim();
  const plz = (company.plz ?? "").trim();
  return stadt.length > 0 && (strasse.length > 0 || plz.length > 0);
}
