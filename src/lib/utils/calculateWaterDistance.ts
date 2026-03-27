import L from "leaflet";
import { determineWassertyp } from "@/lib/constants/wassertyp";

/**
 * Calculates the distance to the nearest water feature and determines its type using Overpass API.
 *
 * This function queries OpenStreetMap data via Overpass API to find nearby water features
 * (rivers, lakes, coastlines, etc.) within a 10km radius. It calculates the geodesic distance
 * to the closest point on any water way and determines the water type based on OSM tags.
 *
 * Limitations:
 * - Uses approximate distance to geometry points (not exact closest point on way).
 * - Does not detect if the point is inside a water polygon (requires PostGIS for accurate containment).
 * - Relies on OSM data completeness; may miss small or unmapped water features.
 * - API rate limits and timeouts may affect reliability.
 * - Future improvement: Migrate to PostGIS for accurate spatial queries and containment checks.
 *
 * @param lat - Latitude of the point to calculate distance from.
 * @param lon - Longitude of the point to calculate distance from.
 * @returns Promise resolving to an object with distance in meters (rounded, 0 if inside water area) and wassertyp, or nulls if no water found or error.
 */
export async function calculateWaterDistance(
  lat: number,
  lon: number,
): Promise<{ distance: number | null; wassertyp: string | null }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  // Add small random jitter to avoid Overpass cache issues
  const jitterLat = lat + (Math.random() - 0.5) * 0.0002;
  const jitterLon = lon + (Math.random() - 0.5) * 0.0002;

  try {
    // Primary query for water ways within 10km
    const query = `
      [out:json][timeout:25];
      (
        way(around:10000,${jitterLat},${jitterLon})[waterway];
        way(around:10000,${jitterLat},${jitterLon})[natural=water];
        way(around:10000,${jitterLat},${jitterLon})[natural=coastline];
        way(around:10000,${jitterLat},${jitterLon})[water=lake];
        way(around:10000,${jitterLat},${jitterLon})[water=pond];
        way(around:10000,${jitterLat},${jitterLon})[water=reservoir];
      );
      out geom;
    `;

    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.elements || data.elements.length === 0) {
      // Fallback: Try querying for water areas using is_in for containment check
      console.warn(`No water ways found near ${lat},${lon}, attempting area containment check`);
      const fallbackQuery = `
        [out:json][timeout:25];
        is_in(${jitterLat},${jitterLon});
        area._[natural=water];
        way(area)[waterway];
        out geom;
      `;

      const fallbackResponse = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: fallbackQuery,
        signal: controller.signal,
      });

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        if (fallbackData.elements && fallbackData.elements.length > 0) {
          // If fallback finds elements, assume point is inside or very close, return distance 0
          console.log(`Point ${lat},${lon} appears to be inside or near a water area`);
          return { distance: 0, wassertyp: determineWassertyp(fallbackData.elements[0].tags || {}) };
        }
      }

      return { distance: null, wassertyp: null };
    }

    let minDistance = Infinity;
    let bestWassertyp: string | null = null;

    const point = L.latLng(lat, lon);

    for (const element of data.elements) {
      if (element.type === "way" && element.geometry) {
        for (const geom of element.geometry) {
          const geomPoint = L.latLng(geom.lat, geom.lon);
          const dist = point.distanceTo(geomPoint);
          if (dist < minDistance) {
            minDistance = dist;
            bestWassertyp = determineWassertyp(element.tags || {});
          }
        }
      }
    }

    if (minDistance === Infinity) {
      return { distance: null, wassertyp: null };
    }

    return { distance: Math.round(minDistance), wassertyp: bestWassertyp };
  } catch (error) {
    console.warn(`Error calculating water distance for ${lat},${lon}:`, error);
    return { distance: null, wassertyp: null };
  } finally {
    clearTimeout(timeoutId);
  }
}
