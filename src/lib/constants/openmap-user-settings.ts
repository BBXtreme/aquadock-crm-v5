/** `user_settings.key` prefix for OpenMap client preferences (per user). */
export const OPENMAP_USER_SETTING_KEYS = [
  "openmap_auto_load_pois",
  "openmap_cache_ttl_minutes",
  "openmap_max_pois_memory",
  "openmap_aggressive_caching",
] as const;

export type OpenmapCacheTtlMinutes = 10 | 30 | 120 | 1440;
export type OpenmapMaxPoisMemory = 3000 | 6000 | 12000;

export const OPENMAP_DEFAULT_TTL_MINUTES: OpenmapCacheTtlMinutes = 10;
export const OPENMAP_DEFAULT_MAX_POIS: OpenmapMaxPoisMemory = 6000;
/** Coverage bbox inflation when checking “already fetched” (normal mode). */
export const OPENMAP_COVERAGE_INFLATE_NORMAL = 0.12;
/** Larger inflation when “aggressive caching” is enabled in settings. */
export const OPENMAP_COVERAGE_INFLATE_AGGRESSIVE = 0.25;

export type OpenmapUserPreferencesResolved = {
  autoLoadPois: boolean;
  cacheTtlMs: number;
  maxPoisInMemory: number;
  coverageInflateRatio: number;
};

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function isOpenmapCacheTtlMinutes(n: number): n is OpenmapCacheTtlMinutes {
  return n === 10 || n === 30 || n === 120 || n === 1440;
}

function isOpenmapMaxPoisMemory(n: number): n is OpenmapMaxPoisMemory {
  return n === 3000 || n === 6000 || n === 12000;
}

/**
 * Resolves OpenMap preferences from `user_settings` rows, with safe fallbacks.
 * `localAutoLoad` is used when no DB row exists for auto-load (legacy localStorage-only).
 */
export function resolveOpenmapUserPreferences(
  rows: { key: string; value: unknown }[] | null | undefined,
  localAutoLoad: boolean,
): OpenmapUserPreferencesResolved {
  const map = new Map<string, unknown>();
  for (const row of rows ?? []) {
    map.set(row.key, row.value);
  }

  const ttlRaw = toFiniteNumber(map.get("openmap_cache_ttl_minutes"));
  const ttlMin: OpenmapCacheTtlMinutes =
    ttlRaw !== null && isOpenmapCacheTtlMinutes(ttlRaw) ? ttlRaw : OPENMAP_DEFAULT_TTL_MINUTES;

  const maxRaw = toFiniteNumber(map.get("openmap_max_pois_memory"));
  const maxPois: OpenmapMaxPoisMemory =
    maxRaw !== null && isOpenmapMaxPoisMemory(maxRaw) ? maxRaw : OPENMAP_DEFAULT_MAX_POIS;

  const aggressiveRaw = map.get("openmap_aggressive_caching");
  const aggressive =
    aggressiveRaw === true || aggressiveRaw === "true" || aggressiveRaw === 1 || aggressiveRaw === "1";

  const autoRow = map.get("openmap_auto_load_pois");
  let autoLoadPois = localAutoLoad;
  if (autoRow === false || autoRow === "false" || autoRow === 0 || autoRow === "0") {
    autoLoadPois = false;
  }
  if (autoRow === true || autoRow === "true" || autoRow === 1 || autoRow === "1") {
    autoLoadPois = true;
  }

  return {
    autoLoadPois,
    cacheTtlMs: ttlMin * 60 * 1000,
    maxPoisInMemory: maxPois,
    coverageInflateRatio: aggressive ? OPENMAP_COVERAGE_INFLATE_AGGRESSIVE : OPENMAP_COVERAGE_INFLATE_NORMAL,
  };
}
