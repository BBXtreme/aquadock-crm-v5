import { kundentypMapping } from "@/lib/constants/kundentyp";
import type { PoiCategory } from "@/lib/constants/map-poi-config";
import { calculateWaterDistance } from "./calculateWaterDistance";

// Overpass API endpoints (hardcoded for now - to be refactored into constants)
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.nchc.org.tw/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
];

/**
 * Generates a status-based icon for company markers on the map.
 * @param status - The company status (e.g., 'lead', 'gewonnen').
 * @returns A string representing the icon (e.g., 'circle', 'check-circle').
 */
export function getStatusIcon(status: string): string {
  switch (status) {
    case "gewonnen":
      return "check-circle";
    case "verloren":
      return "x-circle";
    case "lead":
      return "circle";
    case "interessant":
      return "eye";
    case "qualifiziert":
      return "star";
    case "akquise":
      return "target";
    case "angebot":
      return "file-text";
    default:
      return "circle";
  }
}

/**
 * Generates an icon for OSM POI markers based on category.
 * @param category - The POI category (e.g., 'restaurant', 'hotel').
 * @returns A string representing the icon (e.g., 'utensils', 'bed').
 */
export function getOsmPoiIcon(category: PoiCategory): string {
  switch (category) {
    case "restaurant":
      return "utensils";
    case "hotel":
      return "bed";
    case "marina":
      return "anchor";
    case "camping":
      return "tent";
    default:
      return "question";
  }
}

/**
 * Fetches OSM POIs from Overpass API with fallback and retry logic.
 * Uses multiple mirror servers for reliability.
 * @param bbox - Bounding box as [south, west, north, east].
 * @param categories - Array of POI categories to query.
 * @returns Promise resolving to an array of POI objects.
 */
export async function fetchOsmPois(
  bbox: [number, number, number, number],
  categories: PoiCategory[],
): Promise<
  Array<{
    id: string;
    lat: number;
    lon: number;
    name?: string;
    category: PoiCategory;
    tags: Record<string, string>;
  }>
> {
  const [south, west, north, east] = bbox;
  const categoryQueries = categories
    .map((cat) => `(node["amenity"="${cat}"](${south},${west},${north},${east});)`)
    .join("");

  const query = `
    [out:json][timeout:25];
    (
      ${categoryQueries}
    );
    out body;
  `;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: query,
        headers: { "Content-Type": "text/plain" },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.elements.map((el: any) => ({
        id: `${el.type}/${el.id}`,
        lat: el.lat,
        lon: el.lon,
        name: el.tags?.name,
        category: categories.find((cat) => Object.keys(el.tags).some((key) => el.tags[key] === cat)) || "unknown",
        tags: el.tags || {},
      }));
    } catch (error) {
      console.warn(`Failed to fetch from ${endpoint}:`, error);
      // Continue to next endpoint
    }
  }

  throw new Error("All Overpass endpoints failed");
}

/**
 * Determines the kundentyp based on OSM tags.
 * @param tags - OSM tags object.
 * @returns The mapped kundentyp or 'sonstige'.
 */
export function getKundentypFromTags(tags: Record<string, string>): string {
  for (const [tagKey, tagValue] of Object.entries(tags)) {
    if (kundentypMapping[tagKey]?.[tagValue]) {
      return kundentypMapping[tagKey][tagValue];
    }
  }
  return "sonstige";
}

/**
 * Calculates water-related info for a POI or company.
 * @param lat - Latitude.
 * @param lon - Longitude.
 * @returns Promise resolving to water distance and type.
 */
export async function getWaterInfo(
  lat: number,
  lon: number,
): Promise<{
  distance: number;
  type: string;
}> {
  return calculateWaterDistance(lat, lon);
}
