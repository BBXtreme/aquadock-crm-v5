import L from 'leaflet';
import { determineWassertyp } from '@/lib/constants/wassertyp';

/**
 * Calculates the distance to the nearest water feature and determines its type using Overpass API.
 *
 * @param lat - Latitude of the point to calculate distance from.
 * @param lon - Longitude of the point to calculate distance from.
 * @returns Promise resolving to an object with distance in meters (rounded) and wassertyp, or nulls if no water found or error.
 */
export async function calculateWaterDistance(
  lat: number,
  lon: number
): Promise<{ distance: number | null; wassertyp: string | null }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    const query = `
      [out:json][timeout:25];
      (
        way(around:8000,${lat},${lon})[waterway];
        way(around:8000,${lat},${lon})[natural=water];
        way(around:8000,${lat},${lon})[natural=coastline];
        way(around:8000,${lat},${lon})[waterway=river];
        way(around:8000,${lat},${lon})[waterway=stream];
        way(around:8000,${lat},${lon})[waterway=canal];
        way(around:8000,${lat},${lon})[waterway=drain];
      );
      out geom;
    `;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.elements || data.elements.length === 0) {
      return { distance: null, wassertyp: null };
    }

    let minDistance = Infinity;
    let bestWassertyp: string | null = null;

    const point = L.latLng(lat, lon);

    for (const element of data.elements) {
      if (element.type === 'way' && element.geometry) {
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
    console.warn('Error calculating water distance:', error);
    return { distance: null, wassertyp: null };
  } finally {
    clearTimeout(timeoutId);
  }
}
