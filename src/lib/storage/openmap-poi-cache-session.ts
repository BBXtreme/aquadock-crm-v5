/**
 * OpenMap OSM coverage cache (v2 JSON) — must stay aligned with the key used in the map feature.
 * Snapshot/restore around `supabase.auth.signOut()` so logout does not wipe this non-auth data.
 */
export const OPENMAP_POI_CACHE_STORAGE_KEY = "openmap-poi-cache";

export function readOpenmapPoiCacheSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(OPENMAP_POI_CACHE_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Re-applies a snapshot; no-op when `value` is null (nothing to restore). */
export function writeOpenmapPoiCacheSnapshot(value: string | null): void {
  if (typeof window === "undefined" || value === null) return;
  try {
    window.localStorage.setItem(OPENMAP_POI_CACHE_STORAGE_KEY, value);
  } catch {
    // Private mode / quota — ignore
  }
}
