// src/lib/constants/overpass-endpoints.ts
/**
 * Overpass API mirror endpoints for fetching OSM data.
 * Used with fallback and retry logic in map utilities and water distance calculations.
 */
export const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
