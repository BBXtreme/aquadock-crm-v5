// src/lib/constants/map-providers.ts
/* 
Map Provider Constants for Leaflet TileLayer

This module contains constants for the different map providers supported by OpenMap.
It includes the tile URLs and attribution for each provider.
*/
// Keys in user_settings for OpenMap basemap provider and credentials.

export const MAP_USER_SETTINGS_KEYS = {
  map_provider: "map_provider",
  google_api_key: "map_google_api_key",
  apple_mapkit_token: "map_apple_mapkit_token",
} as const;

/** Must match OpenMapView historical defaults (CARTO + OSM). */
export const OSM_CARTO_TILE_URL_LIGHT =
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

export const OSM_CARTO_TILE_URL_DARK =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

export const OSM_CARTO_ATTRIBUTION =
  "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors &copy; <a href=\"https://carto.com/attributions\">CARTO</a>";

export const GOOGLE_MAP_TILES_CREATE_SESSION_URL = "https://tile.googleapis.com/v1/createSession";

/** Leaflet `{z}` `{x}` `{y}` placeholders; append `session` and `key` query params when building URL. */
export const GOOGLE_MAP_TILES_2D_TEMPLATE = "https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}";

export const GOOGLE_MAP_TILES_ATTRIBUTION =
  "&copy; <a href=\"https://www.google.com/maps\">Google</a>";
