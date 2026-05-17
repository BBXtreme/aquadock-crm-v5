// src/lib/utils/geocode-nominatim.ts
// Server-side Nominatim (OpenStreetMap) structured search helper.
// Throttling is enforced by the caller (sequential delay in server actions).
// The `cache` Map is per server-action invocation only. For cross-invocation caching, use Redis/Upstash.

import { type Iso3166Alpha2, isIso3166Alpha2, normalizeLandInput } from "@/lib/countries/iso-land";

const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";

/** Exact User-Agent required by OSM Nominatim usage policy. */
export const NOMINATIM_USER_AGENT = "AquaDockCRMv5-Geocoder/2026.04 (+https://crm.aquadock.de)";

export type GeocodeConfidence = "high" | "medium" | "low";

export type GeocodeAddressInput = {
  strasse?: string | null;
  plz?: string | null;
  stadt?: string | null;
  land?: string | null;
};

export type GeocodeFailureReason =
  | "NO_RESULT"
  | "INCOMPLETE_ADDRESS"
  | "NETWORK_ERROR"
  | "INVALID_COORDINATE";

export type GeocodeAddressResult = {
  ok: boolean;
  lat: number | null;
  lon: number | null;
  importance: number | null;
  confidence: GeocodeConfidence | null;
  displayName: string | null;
  reason: GeocodeFailureReason | null;
};

export type ReverseCountryResult = {
  ok: boolean;
  code: Iso3166Alpha2 | null;
  reason: "NO_RESULT" | "INVALID_COORDINATE" | "NETWORK_ERROR" | null;
};

type NominatimJsonResult = {
  lat?: string;
  lon?: string;
  importance?: number | string;
  display_name?: string;
  address?: {
    country_code?: string;
    country?: string;
  };
};

function trimOrEmpty(value: string | null | undefined): string {
  if (value === undefined || value === null) {
    return "";
  }
  return value.trim();
}

function hasMinimumAddress(input: GeocodeAddressInput): boolean {
  const street = trimOrEmpty(input.strasse);
  const plz = trimOrEmpty(input.plz);
  const city = trimOrEmpty(input.stadt);
  if (city.length === 0) {
    return false;
  }
  return street.length > 0 || plz.length > 0;
}

function buildCacheKey(input: GeocodeAddressInput): string {
  return [
    trimOrEmpty(input.strasse).toLowerCase(),
    trimOrEmpty(input.plz).toLowerCase(),
    trimOrEmpty(input.stadt).toLowerCase(),
    trimOrEmpty(input.land).toLowerCase(),
  ].join("|");
}

function mapConfidence(importance: number): GeocodeConfidence {
  if (importance > 0.7) {
    return "high";
  }
  if (importance >= 0.4) {
    return "medium";
  }
  return "low";
}

function parseFirstHit(json: unknown): NominatimJsonResult | null {
  if (!Array.isArray(json) || json.length === 0) {
    return null;
  }
  const first = json[0];
  if (typeof first !== "object" || first === null) {
    return null;
  }
  return first as NominatimJsonResult;
}

function toFailure(reason: GeocodeFailureReason): GeocodeAddressResult {
  return {
    ok: false,
    lat: null,
    lon: null,
    importance: null,
    confidence: null,
    displayName: null,
    reason,
  };
}

/**
 * Single structured Nominatim lookup. Caller supplies a fresh `cache` Map per server action
 * invocation (in-memory only for that request). For distributed caching, use Redis/Upstash later.
 */
export async function geocodeAddress(
  input: GeocodeAddressInput,
  cache: Map<string, GeocodeAddressResult>,
): Promise<GeocodeAddressResult> {
  if (!hasMinimumAddress(input)) {
    return toFailure("INCOMPLETE_ADDRESS");
  }

  const key = buildCacheKey(input);
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  const params = new URLSearchParams();
  const street = trimOrEmpty(input.strasse);
  const postalcode = trimOrEmpty(input.plz);
  const city = trimOrEmpty(input.stadt);
  const trimmedLand = trimOrEmpty(input.land);
  const landNorm = trimmedLand.length > 0 ? normalizeLandInput(trimmedLand) : null;

  if (street.length > 0) {
    params.set("street", street);
  }
  if (postalcode.length > 0) {
    params.set("postalcode", postalcode);
  }
  params.set("city", city);

  if (landNorm?.ok) {
    params.set("countrycodes", landNorm.code.toLowerCase());
  } else {
    params.set("countrycodes", "de");
    if (trimmedLand.length > 0) {
      params.set("country", trimmedLand);
    }
  }
  params.set("accept-language", "de");
  params.set("format", "jsonv2");
  params.set("limit", "1");
  params.set("addressdetails", "1");

  const url = `${NOMINATIM_SEARCH_URL}?${params.toString()}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": NOMINATIM_USER_AGENT,
        "Accept-Language": "de",
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch {
    const failure = toFailure("NETWORK_ERROR");
    cache.set(key, failure);
    return failure;
  }

  if (!response.ok) {
    const failure = toFailure("NETWORK_ERROR");
    cache.set(key, failure);
    return failure;
  }

  let parsedJson: unknown;
  try {
    parsedJson = await response.json();
  } catch {
    const failure = toFailure("NETWORK_ERROR");
    cache.set(key, failure);
    return failure;
  }

  const hit = parseFirstHit(parsedJson);
  if (hit === null) {
    const failure = toFailure("NO_RESULT");
    cache.set(key, failure);
    return failure;
  }

  const latStr = hit.lat;
  const lonStr = hit.lon;
  if (latStr === undefined || lonStr === undefined) {
    const failure = toFailure("NO_RESULT");
    cache.set(key, failure);
    return failure;
  }

  const lat = Number.parseFloat(latStr);
  const lon = Number.parseFloat(lonStr);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    const failure = toFailure("INVALID_COORDINATE");
    cache.set(key, failure);
    return failure;
  }

  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    const failure = toFailure("INVALID_COORDINATE");
    cache.set(key, failure);
    return failure;
  }

  const rawImportance = hit.importance;
  const parsedImportance =
    typeof rawImportance === "number"
      ? rawImportance
      : typeof rawImportance === "string"
        ? Number.parseFloat(rawImportance)
        : Number.NaN;
  const importance = Number.isFinite(parsedImportance) ? parsedImportance : 0;

  const success: GeocodeAddressResult = {
    ok: true,
    lat,
    lon,
    importance,
    confidence: mapConfidence(importance),
    displayName: typeof hit.display_name === "string" ? hit.display_name : null,
    reason: null,
  };
  cache.set(key, success);
  return success;
}

export async function reverseGeocodeCountry(
  lat: number,
  lon: number,
  cache: Map<string, ReverseCountryResult>,
): Promise<ReverseCountryResult> {
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return { ok: false, code: null, reason: "INVALID_COORDINATE" };
  }
  const key = `${lat.toFixed(4)}|${lon.toFixed(4)}`;
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const params = new URLSearchParams();
  params.set("lat", String(lat));
  params.set("lon", String(lon));
  params.set("format", "jsonv2");
  params.set("addressdetails", "1");
  params.set("accept-language", "de");
  const url = `${NOMINATIM_REVERSE_URL}?${params.toString()}`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": NOMINATIM_USER_AGENT,
        "Accept-Language": "de",
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch {
    const failure = { ok: false, code: null, reason: "NETWORK_ERROR" as const };
    cache.set(key, failure);
    return failure;
  }
  if (!response.ok) {
    const failure = { ok: false, code: null, reason: "NETWORK_ERROR" as const };
    cache.set(key, failure);
    return failure;
  }
  let parsedJson: unknown;
  try {
    parsedJson = await response.json();
  } catch {
    const failure = { ok: false, code: null, reason: "NETWORK_ERROR" as const };
    cache.set(key, failure);
    return failure;
  }
  const hit = parsedJson as NominatimJsonResult;
  if (hit === null || typeof hit.lat !== "string") {
    const failure = { ok: false, code: null, reason: "NO_RESULT" as const };
    cache.set(key, failure);
    return failure;
  }
  const codeRaw = hit.address?.country_code;
  if (typeof codeRaw === "string" && codeRaw.length === 2) {
    const code = codeRaw.toUpperCase() as Iso3166Alpha2;
    if (isIso3166Alpha2(code)) {
      const success = { ok: true, code, reason: null };
      cache.set(key, success);
      return success;
    }
  }
  // Fallback to normalize on country name if no code
  const countryName = hit.address?.country;
  if (typeof countryName === "string") {
    const normalized = normalizeLandInput(countryName);
    if (normalized.ok) {
      const success = { ok: true, code: normalized.code, reason: null };
      cache.set(key, success);
      return success;
    }
  }
  const failure = { ok: false, code: null, reason: "NO_RESULT" as const };
  cache.set(key, failure);
  return failure;
}
