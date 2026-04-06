// src/lib/utils/map.ts
// Utility functions related to map handling, including fetching POIs
// from OSM and generating icons based on status
// The `fetchOsmPois` function queries the Overpass API for POIs within
// the given bounds and active categories, with retry logic and
// deduplication

import L from "leaflet";

import { poiCategories } from "@/lib/constants/map-poi-config";
import { statusColors } from "@/lib/constants/map-status-colors";
import { OVERPASS_ENDPOINTS } from "@/lib/constants/overpass-endpoints";

// ─────────────────────────────────────────────────────────────
// Type for POI category config (derived from map-poi-config.ts)
// Matches the exact readonly shape used in the constants file.
// ─────────────────────────────────────────────────────────────
type PoiCategory = {
  tags: readonly string[];
  // label, icon, color, etc. can be added later if needed
};

let poiFetchTimeout: NodeJS.Timeout | null = null;

export const getStatusIcon = (status?: string) => {
  const color = statusColors[status?.toLowerCase() || "lead"] || statusColors.lead;

  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background-color:${color};width:32px;height:32px;border-radius:50%;border:3px solid white;box-shadow:0 3px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:14px;">${(status?.charAt(0) || "?").toUpperCase()}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

export const getOsmPoiIcon = (isDarkMode = false) => {
  const bgColor = isDarkMode ? "#374151" : "white";
  const borderColor = isDarkMode ? "#9ca3af" : "#d1d5db";
  const textColor = isDarkMode ? "white" : "#374151";

  return L.divIcon({
    className: "osm-poi",
    html: `<div style="background-color:${bgColor};width:24px;height:24px;border-radius:50%;border:2px solid ${borderColor};box-shadow:0 2px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:${textColor};font-weight:bold;font-size:12px;">?</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -15],
  });
};

type OsmPoi = {
  id: string;
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

export async function fetchOsmPois(
  bounds: L.LatLngBounds,
  activeCategories: (keyof typeof poiCategories)[] = Object.keys(poiCategories) as (keyof typeof poiCategories)[],
  retryCount = 0,
): Promise<{ pois: OsmPoi[]; totalFound: number; query: string }> {
  if (poiFetchTimeout) clearTimeout(poiFetchTimeout);

  return new Promise((resolve, _reject) => {
    poiFetchTimeout = setTimeout(async () => {
      const bbox = bounds.toBBoxString(); // "west,south,east,north"
      const [west, south, east, north] = bbox.split(",").map(Number);
      const overpassBbox = `${south},${west},${north},${east}`; // "south,west,north,east"

      // Build tag groups from active poiCategories
      const tagGroups: Record<string, string[]> = {};

      // ─────────────────────────────────────────────────────────────
      // PERFECTLY TYPED REDUCE – no assertion, no `any`, matches readonly tags
      // ─────────────────────────────────────────────────────────────
      const activePoiCategories = activeCategories.reduce<Record<string, PoiCategory>>((acc, key) => {
        const category = poiCategories[key];
        if (category) {
          acc[key] = category;
        }
        return acc;
      }, {});

      for (const category of Object.values(activePoiCategories)) {
        for (const tag of category.tags) {
          if (tag.includes("=")) {
            const [key, value] = tag.split("=");
            // EXPLICIT narrowing required by strict TS (noUncheckedIndexedAccess)
            // This satisfies TS2538 without using any `!` assertion
            if (key) {
              tagGroups[key] ??= [];
              tagGroups[key].push(value ?? "");
            }
          } else {
            // assume amenity
            tagGroups.amenity ??= [];
            tagGroups.amenity.push(tag);
          }
        }
      }

      // Create conditions for each tag group
      const conditions = Object.entries(tagGroups).map(
        ([key, values]) => `["${key}"~"${values.join("|")}"](${overpassBbox})`,
      );

      const query = `
  [out:json][timeout:60][maxsize:1Mi];
  (
${conditions.map((cond) => `      node${cond};`).join("\n")}
${conditions.map((cond) => `      way${cond};`).join("\n")}
  );
  out center;
`;

      if (conditions.length === 0) {
        resolve({ pois: [], totalFound: 0, query });
        return;
      }

      // Basic deduplication by OSM ID
      const seen = new Set<string>();

      const emptyResult = { pois: [] as OsmPoi[], totalFound: 0, query };

      for (const endpoint of OVERPASS_ENDPOINTS) {
        let retries = retryCount;
        const maxRetries = 3;

        while (retries < maxRetries) {
          try {
            const url = `${endpoint}?data=${encodeURIComponent(query)}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s max

            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (res.ok) {
              const data = await res.json();
              const deduplicated = (data.elements || []).filter((poi: OsmPoi) => {
                const key = `${poi.type}/${poi.id}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              });

              resolve({
                pois: deduplicated,
                totalFound: deduplicated.length,
                query,
              });
              return;
            }

            if (res.status === 429) {
              retries++;
              const delay = 2 ** retries * 800;
              await new Promise((r) => setTimeout(r, delay));
            } else if (res.status === 403 || res.status === 504) {
              break;
            } else {
              break;
            }
          } catch (err: unknown) {
            if (err instanceof Error && err.name === "AbortError") break;
            if (endpoint === OVERPASS_ENDPOINTS[OVERPASS_ENDPOINTS.length - 1] && retries >= maxRetries - 1) {
              resolve(emptyResult);
              return;
            }
            break;
          }
        }
      }

      // All mirrors failed or returned non-retryable errors — POI layer is best-effort; map still works.
      resolve(emptyResult);
    }, 300);
  });
}

export function getOpenStreetMapUrl(osm: string | null | undefined): string {
  return osm ? `https://www.openstreetmap.org/${osm}` : "";
}

export function normalizeOsmId(osm: string): string {
  if (osm.startsWith('https://www.openstreetmap.org/')) {
    const parts = osm.split('/');
    return `${parts[3]}/${parts[4]}`;
  }
  return osm;
}
