// src/lib/utils/calculateWaterDistance.ts
import L from "leaflet";
import { determineWassertyp } from "@/lib/constants/wassertyp";

/**
 * Calculates the distance to the nearest water feature using Overpass API.
 *
 * Improvements (March 2026):
 * - Aggressive client-side caching (localStorage, 24h TTL)
 * - Reduced radius (7km instead of 10km)
 * - Multiple endpoint rotation with backoff
 * - Only called on explicit user request from POI popup
 */

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

    // Trim cache to prevent unlimited growth
    const entries = Object.entries(cache).sort((a, b) => b[1].timestamp - a[1].timestamp);
    const trimmed = Object.fromEntries(entries.slice(0, MAX_CACHE_ENTRIES));

    localStorage.setItem(WATER_CACHE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn("Failed to save water cache", e);
  }
}

export async function calculateWaterDistance(
  lat: number,
  lon: number,
): Promise<{ distance: number | null; wassertyp: string | null }> {
  // 1. Check cache first (fast path)
  const cached = getWaterCache(lat, lon);
  if (cached) {
    console.log(`[Water] Cache hit for ${lat.toFixed(5)},${lon.toFixed(5)} → ${cached.distance}m`);
    return { distance: cached.distance, wassertyp: cached.wassertyp };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  // Small jitter to avoid Overpass caching
  const jitterLat = lat + (Math.random() - 0.5) * 0.0003;
  const jitterLon = lon + (Math.random() - 0.5) * 0.0003;

  try {
    // Optimized primary query - smaller radius, cleaner tags
    const primaryQuery = `
[out:json][timeout:20];
(
  nwr(around:7000,${jitterLat},${jitterLon})[waterway];
  nwr(around:7000,${jitterLat},${jitterLon})[natural=water];
  nwr(around:7000,${jitterLat},${jitterLon})[natural=coastline];
  nwr(around:7000,${jitterLat},${jitterLon})[water~"^(lake|pond|reservoir|basin|river)$"];
);
out geom;`;

    const endpoints = [
      "https://overpass-api.de/api/interpreter",
      "https://overpass.private.coffee/api/interpreter",
      "https://overpass.osm.ch/api/interpreter",
      "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          body: primaryQuery,
          signal: controller.signal,
        });

        if (response.status === 429) {
          console.warn(`[Water] ${endpoint} → 429 rate limit, trying next...`);
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
        if (err instanceof Error) {
          console.warn(`[Water] ${endpoint} failed:`, err.message);
        } else {
          console.warn(`[Water] ${endpoint} failed:`, err);
        }
      }
    }

    // Fallback: Check if point is inside a water area
    console.warn(`No nearby water found near ${lat.toFixed(5)},${lon.toFixed(5)}. Trying containment fallback...`);

    const fallbackQuery = `
[out:json][timeout:15];
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
      console.warn("Fallback query also failed", fallbackErr);
    }

    const noResult = { distance: null, wassertyp: null };
    setWaterCache(lat, lon, noResult);
    return noResult;
  } catch (error) {
    console.warn(`Water distance calculation failed for ${lat.toFixed(5)},${lon.toFixed(5)}:`, error);
    const failResult = { distance: null, wassertyp: null };
    setWaterCache(lat, lon, failResult);
    return failResult;
  } finally {
    clearTimeout(timeoutId);
  }
}
