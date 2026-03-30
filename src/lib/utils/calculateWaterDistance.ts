// src/lib/utils/calculateWaterDistance.ts
// This utility calculates the distance to the nearest water feature
// using the Overpass API
// It includes aggressive client-side caching to minimize API calls,
// with a TTL of 24 hours
// The search radius has been reduced to 1000m to focus on nearby water
// features
// Multiple Overpass API endpoints are used with retry logic to improve
// reliability
// The function is designed to be called on explicit user request from
// a POI popup, rather than automatically on map movements, to further
// reduce unnecessary API calls
// The result includes both the distance to the nearest water feature
// and the determined wassertyp (type of water), which can be used for
// display purposes in the UI
// The code is structured to handle various edge cases, such as API rate
// limits, timeouts, and the possibility of no nearby water features
// being found, while providing informative console logs for debugging
// The caching mechanism uses localStorage and includes logic to trim the cache to a maximum number of entries to prevent unbounded growth, ensuring that the most recent entries are retained while older ones are removed when the limit is exceeded. This helps maintain performance and storage efficiency over time.

/**
 * Calculates the distance to the nearest water feature using Overpass API.
 *
 * Improvements (March 2026):
 * - Aggressive client-side caching (localStorage, 24h TTL)
 * - Reduced radius to 1000m (1km) – we only care about close water
 * - Multiple endpoint rotation with backoff
 * - Only called on explicit user request from POI popup
 */

// Note: This function relies on the Leaflet library for distance calculations, which is already a dependency of the project.

import L from "leaflet";
import { OVERPASS_ENDPOINTS } from "@/lib/constants/overpass-endpoints";
import { determineWassertyp } from "@/lib/constants/wassertyp";

const WATER_CACHE_KEY = "aquadock_water_cache_v2";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
const MAX_CACHE_ENTRIES = 500;

interface WaterCacheEntry {
  distance: number | null;
  wassertyp: string | null;
  timestamp: number;
}

function getCacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(5)},${lon.toFixed(5)}`;
}

function getWaterCache(lat: number, lon: number): WaterCacheEntry | null {
  try {
    const cacheStr = localStorage.getItem(WATER_CACHE_KEY);
    if (!cacheStr) return null;

    const cache = JSON.parse(cacheStr) as Record<string, WaterCacheEntry>;
    const key = getCacheKey(lat, lon);
    const entry = cache[key];

    if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
      return entry;
    }
    return null;
  } catch {
    return null;
  }
}

function setWaterCache(lat: number, lon: number, result: { distance: number | null; wassertyp: string | null }) {
  try {
    const cacheStr = localStorage.getItem(WATER_CACHE_KEY) || "{}";
    const cache = JSON.parse(cacheStr) as Record<string, WaterCacheEntry>;
    const key = getCacheKey(lat, lon);

    cache[key] = {
      ...result,
      timestamp: Date.now(),
    };

    // Trim cache
    const entries = Object.entries(cache).sort((a, b) => b[1].timestamp - a[1].timestamp);
    const trimmed = Object.fromEntries(entries.slice(0, MAX_CACHE_ENTRIES));

    localStorage.setItem(WATER_CACHE_KEY, JSON.stringify(trimmed));
  } catch (e) {
  }
}

export async function calculateWaterDistance(
  lat: number,
  lon: number,
): Promise<{ distance: number | null; wassertyp: string | null }> {
  // 1. Check cache first (fast path)
  const cached = getWaterCache(lat, lon);
  if (cached) {
    return { distance: cached.distance, wassertyp: cached.wassertyp };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // reduced timeout

  // Small jitter
  const jitterLat = lat + (Math.random() - 0.5) * 0.0002;
  const jitterLon = lon + (Math.random() - 0.5) * 0.0002;

  try {
    // Optimized primary query – now only 1km radius
    const primaryQuery = `
[out:json][timeout:15];
(
  nwr(around:1000,${jitterLat},${jitterLon})[waterway];
  nwr(around:1000,${jitterLat},${jitterLon})[natural=water];
  nwr(around:1000,${jitterLat},${jitterLon})[natural=coastline];
  nwr(around:1000,${jitterLat},${jitterLon})[water~"^(lake|pond|reservoir|basin|river)$"];
);
out geom;`;

    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          body: primaryQuery,
          signal: controller.signal,
        });

        if (response.status === 429) {
          await new Promise((r) => setTimeout(r, 800));
          continue;
        }

        if (!response.ok) {
          throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.elements && data.elements.length > 0) {
          let minDistance = Infinity;
          let bestWassertyp: string | null = null;

          const point = L.latLng(lat, lon);

          for (const element of data.elements) {
            const tags = element.tags || {};
            const candidateType = determineWassertyp(tags);

            if (element.geometry && Array.isArray(element.geometry)) {
              for (const geom of element.geometry) {
                if (geom.lat && geom.lon) {
                  const geomPoint = L.latLng(geom.lat, geom.lon);
                  const dist = point.distanceTo(geomPoint);
                  if (dist < minDistance) {
                    minDistance = dist;
                    bestWassertyp = candidateType || bestWassertyp;
                  }
                }
              }
            }
          }

          const result = {
            distance: minDistance < Infinity ? Math.round(minDistance) : null,
            wassertyp: bestWassertyp,
          };

          setWaterCache(lat, lon, result);
          return result;
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") break;
      }
    }

    // Fallback: Check if point is inside a water area
    const fallbackQuery = `
[out:json][timeout:12];
is_in(${jitterLat},${jitterLon});
area._[natural=water];
out tags;`;

    try {
      const fallbackResponse = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: fallbackQuery,
        signal: controller.signal,
      });

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        if (fallbackData.elements && fallbackData.elements.length > 0) {
          const waterArea = fallbackData.elements[0];
          const wassertyp = determineWassertyp(waterArea.tags || {}) || "See";
          const result = { distance: 0, wassertyp };
          setWaterCache(lat, lon, result);
          return result;
        }
      }
    } catch (fallbackErr) {
    }

    const noResult = { distance: null, wassertyp: null };
    setWaterCache(lat, lon, noResult);
    return noResult;
  } catch (error) {
    const failResult = { distance: null, wassertyp: null };
    setWaterCache(lat, lon, failResult);
    return failResult;
  } finally {
    clearTimeout(timeoutId);
  }
}
