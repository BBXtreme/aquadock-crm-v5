/**
 * Overpass API mirror endpoints for fetching OSM data.
 * Used with fallback and retry logic in map utilities.
 */
export const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.nchc.org.tw/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
];
