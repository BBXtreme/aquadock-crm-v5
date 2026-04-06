// src/lib/map/map-provider.ts
import { z } from "zod";

import {
  GOOGLE_MAP_TILES_2D_TEMPLATE,
  GOOGLE_MAP_TILES_ATTRIBUTION,
  GOOGLE_MAP_TILES_CREATE_SESSION_URL,
  OSM_CARTO_ATTRIBUTION,
  OSM_CARTO_TILE_URL_DARK,
  OSM_CARTO_TILE_URL_LIGHT,
} from "@/lib/constants/map-providers";
import type { MapProviderId } from "@/lib/validations/map-settings";

/**
 * React `key` for Leaflet TileLayer whenever the basemap is CARTO/OSM (default, Apple, or Google fallback).
 * Stable across light/dark so the layer updates `url`/`attribution` in place — same behavior as legacy OpenMap.
 */
export const OPENMAP_CARTO_TILE_LAYER_REACT_KEY = "openmap-carto-basemap";

/** Roadmap styling for Map Tiles API session (dark UI). */
const GOOGLE_ROADMAP_DARK_STYLES: readonly Record<string, unknown>[] = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#757575" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#757575" }],
  },
  {
    featureType: "road",
    elementType: "geometry.fill",
    stylers: [{ color: "#2c2c2c" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8a8a8a" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#000000" }],
  },
];

const googleSessionResponseSchema = z
  .object({
    session: z.string().min(1),
  })
  .strict();

function osmTileUrl(isDark: boolean): string {
  return isDark ? OSM_CARTO_TILE_URL_DARK : OSM_CARTO_TILE_URL_LIGHT;
}

export type GoogleTilesSessionError = "network" | "http" | "invalid_body";

export type GoogleTilesSessionResult =
  | { success: true; session: string }
  | { success: false; error: GoogleTilesSessionError };

export type ResolvedBasemap = {
  url: string;
  attribution: string;
  showAppleBasemapNotice: boolean;
  /** React `key` for TileLayer: OPENMAP_CARTO_TILE_LAYER_REACT_KEY for CARTO/OSM, or a google-* key when tiles are from Google. */
  tileLayerReactKey: string;
};

export function resolveBasemap(params: {
  provider: MapProviderId;
  isDark: boolean;
  googleSessionId: string | null;
  googleApiKey: string | null;
}): ResolvedBasemap {
  const { provider, isDark, googleSessionId, googleApiKey } = params;
  const osmUrl = osmTileUrl(isDark);

  /*
   * ─── OSM default preservation (non-negotiable) ─────────────────────────────────
   * • provider === "osm": only OSM_CARTO_* template URLs + OSM_CARTO_ATTRIBUTION (legacy OpenMap parity).
   * • No Google/Apple logic, no extra UI flags, no session state.
   * • tileLayerReactKey === OPENMAP_CARTO_TILE_LAYER_REACT_KEY so theme toggles update url in place (no remount).
   * Apple uses the same tiles/attribution/key as OSM plus showAppleBasemapNotice for a small in-map hint only.
   */
  if (provider === "osm") {
    return {
      url: osmUrl,
      attribution: OSM_CARTO_ATTRIBUTION,
      showAppleBasemapNotice: false,
      tileLayerReactKey: OPENMAP_CARTO_TILE_LAYER_REACT_KEY,
    };
  }

  if (provider === "apple") {
    return {
      url: osmUrl,
      attribution: OSM_CARTO_ATTRIBUTION,
      showAppleBasemapNotice: true,
      tileLayerReactKey: OPENMAP_CARTO_TILE_LAYER_REACT_KEY,
    };
  }

  // google
  const keyOk = typeof googleApiKey === "string" && googleApiKey.trim().length > 0;
  const sessionOk = typeof googleSessionId === "string" && googleSessionId.length > 0;

  if (keyOk && sessionOk) {
    const q = new URLSearchParams({
      session: googleSessionId,
      key: googleApiKey.trim(),
    });
    return {
      url: `${GOOGLE_MAP_TILES_2D_TEMPLATE}?${q.toString()}`,
      attribution: GOOGLE_MAP_TILES_ATTRIBUTION,
      showAppleBasemapNotice: false,
      tileLayerReactKey: `google-${isDark ? "dark" : "light"}-${googleSessionId.slice(0, 12)}`,
    };
  }

  return {
    url: osmUrl,
    attribution: OSM_CARTO_ATTRIBUTION,
    showAppleBasemapNotice: false,
    tileLayerReactKey: OPENMAP_CARTO_TILE_LAYER_REACT_KEY,
  };
}

export async function createGoogleMapTilesSession(
  apiKey: string,
  options: { isDarkMode: boolean },
): Promise<GoogleTilesSessionResult> {
  const trimmed = apiKey.trim();
  if (trimmed.length === 0) {
    return { success: false, error: "invalid_body" };
  }

  const body: Record<string, unknown> = {
    mapType: "roadmap",
    language: "de-DE",
    region: "DE",
  };
  if (options.isDarkMode) {
    body.styles = [...GOOGLE_ROADMAP_DARK_STYLES];
  }

  const url = `${GOOGLE_MAP_TILES_CREATE_SESSION_URL}?key=${encodeURIComponent(trimmed)}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { success: false, error: "network" };
  }

  if (!res.ok) {
    return { success: false, error: "http" };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { success: false, error: "invalid_body" };
  }

  const parsed = googleSessionResponseSchema.safeParse(json);
  if (parsed.success) {
    return { success: true, session: parsed.data.session };
  }
  return { success: false, error: "invalid_body" };
}
