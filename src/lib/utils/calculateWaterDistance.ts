import L from "leaflet";
import { determineWassertyp } from "@/lib/constants/wassertyp";

/**
 * Calculates the distance to the nearest water feature and determines its type using Overpass API.
 *
 * Improved query strategy (March 2026):
 * - Single efficient union with nwr (nodes/ways/relations)
 * - 10km around radius
 * - Better tag coverage including common water=* values
 * - Proper is_in fallback for points inside large water areas
 * - Samples all geometry points + considers first/last node for better coastline coverage
 *
 * Limitations (unchanged):
 * - Approximate distance (node sampling, not true closest-point-on-line)
 * - Depends on OSM tagging quality
 * - Future: Migrate to Supabase PostGIS with ST_Distance + ST_Contains for exact results
 */
export async function calculateWaterDistance(
  lat: number,
  lon: number,
): Promise<{ distance: number | null; wassertyp: string | null }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  // Small jitter to avoid Overpass result caching
  const jitterLat = lat + (Math.random() - 0.5) * 0.0002;
  const jitterLon = lon + (Math.random() - 0.5) * 0.0002;

  try {
    // Optimized primary query
    const primaryQuery = `
[out:json][timeout:25];
(
  nwr(around:10000,${jitterLat},${jitterLon})[waterway];
  nwr(around:10000,${jitterLat},${jitterLon})[natural=water];
  nwr(around:10000,${jitterLat},${jitterLon})[natural=coastline];
  nwr(around:10000,${jitterLat},${jitterLon})[water~"lake|pond|reservoir|basin"];
);
out geom;
`;

    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: primaryQuery,
      signal: controller.signal,
    });

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

      if (minDistance < Infinity) {
        return {
          distance: Math.round(minDistance),
          wassertyp: bestWassertyp,
        };
      }
    }

    // Fallback: Check if point is inside a water area (is_in)
    console.warn(`No nearby water ways found near ${lat},${lon}. Trying containment fallback...`);

    const fallbackQuery = `
[out:json][timeout:20];
is_in(${jitterLat},${jitterLon});
area._[natural=water];
out tags;
`;

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
        console.log(`Point appears inside water area: ${wassertyp}`);
        return { distance: 0, wassertyp };
      }
    }

    return { distance: null, wassertyp: null };
  } catch (error) {
    console.warn(`Water distance calculation failed for ${lat.toFixed(5)},${lon.toFixed(5)}:`, error);
    return { distance: null, wassertyp: null };
  } finally {
    clearTimeout(timeoutId);
  }
}
