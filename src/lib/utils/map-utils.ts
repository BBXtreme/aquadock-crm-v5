// src/lib/utils/map.ts
// Utility functions related to map handling, including fetching POIs
// from OSM and generating icons based on status
// The `fetchOsmPois` function queries the Overpass API for POIs within
// the given bounds and active categories, with retry logic and
// deduplication

import L from "leaflet";

import { poiCategories } from "@/lib/constants/map-poi-config";
import {
  kundentypColors,
  statusColors,
} from "@/lib/constants/map-status-colors";
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

export const getHighlightedStatusIcon = (status?: string, isDarkMode = false) => {
  const color = statusColors[status?.toLowerCase() || "lead"] || statusColors.lead;
  const ringColor = isDarkMode ? "#3b82f6" : "#2563eb";

  return L.divIcon({
    className: "custom-marker custom-marker--highlight",
    html: `<div class="highlight-inner" style="background-color:${color};width:40px;height:40px;border-radius:50%;border:4px solid white;box-shadow:0 0 0 6px ${ringColor}30,0 4px 12px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:16px;">${(status?.charAt(0) || "?").toUpperCase()}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

/** Status letter(s) — first letter, or two letters when first letter would collide (exported for legend). */
export const statusLetterMap: Record<string, string> = {
  lead: "N", // Neu
  interessant: "I",
  qualifiziert: "Q",
  akquise: "Ak",
  angebot: "G",
  gewonnen: "W",
  verloren: "V",
  kunde: "K",
  partner: "P",
  inaktiv: "—",
};

/**
 * Professional dual-attribute marker for companies on OpenMap.
 * Layered design (sophisticated & calm):
 *   1. Thick outer ring = kundentyp color (primary, scannable)
 *   2. Thin gray separator ring
 *   3. Pure white center disc with emoji (clean, high contrast)
 *   + Tiny status letter badge (bottom-right, no color)
 * This creates a premium "medallion" look with excellent readability.
 */
export const getCompanyMarkerIcon = (
  status?: string,
  kundentyp?: string,
  isHighlighted = false,
  isDarkMode = false,
) => {
  const sKey = (status || "lead").toLowerCase();
  const kKey = (kundentyp || "sonstige").toLowerCase();

  const kundentypColor = kundentypColors[kKey] || kundentypColors.sonstige;

  // Compact professional emoji/symbol map (sophisticated, not cluttered)
  const kundentypSymbol: Record<string, string> = {
    restaurant: "🍽",
    hotel: "🏨",
    marina: "⚓",
    camping: "⛺",
    bootsverleih: "🚤",
    segelschule: "⛵",
    resort: "🌴",
    segelverein: "🏆",
    neukunde: "🆕",
    bestandskunde: "⭐",
    interessent: "👁",
    partner: "🤝",
    sonstige: "·",
  };
  const symbol = kundentypSymbol[kKey] || kKey.charAt(0).toUpperCase();

  const letter = statusLetterMap[sKey] || sKey.slice(0, 2).toUpperCase();

  const size = isHighlighted ? 42 : 34;
  const ringWidth = isHighlighted ? 5 : 3.5;
  const highlightRing = isHighlighted
    ? `0 0 0 5px ${kundentypColor}25, 0 0 0 10px ${isDarkMode ? "#3b82f620" : "#2563eb15"}`
    : "";

  const grayRing = "#ffffff";
  const letterBg = isDarkMode ? "#111827" : "#1f2937";

  const html = `
    <div class="company-marker${isHighlighted ? " company-marker--highlight" : ""}" style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${isDarkMode ? "#1f2937" : "#ffffff"};
      border:${ringWidth}px solid ${kundentypColor};
      box-shadow:0 3px 8px rgba(0,0,0,0.28),${highlightRing};
      display:flex;align-items:center;justify-content:center;
      position:relative;
    ">
      <!-- Gray separator ring -->
      <div style="
        width:22px;height:22px;border-radius:50%;
        border:2px solid ${grayRing};
        display:flex;align-items:center;justify-content:center;
      ">
        <!-- Pure white center with icon -->
        <div style="
          width:18px;height:18px;border-radius:50%;
          background:white;
          display:flex;align-items:center;justify-content:center;
          color:#374151;font-size:${isHighlighted ? 12 : 10.5}px;font-weight:600;
          box-shadow:inset 0 1px 1px rgba(0,0,0,0.06);
        ">${symbol}</div>
      </div>

      <!-- Status letter (no color) — elegant tiny badge (1 or 2 chars) -->
      <div style="
        position:absolute;bottom:1px;right:1px;min-width:${letter.length > 1 ? "15px" : "11px"};height:11px;
        padding:0 ${letter.length > 1 ? "3.5px" : "2.5px"};border-radius:3px;background:${letterBg};
        display:flex;align-items:center;justify-content:center;
        color:#fff;font-size:${letter.length > 1 ? "6.8px" : "7.5px"};font-weight:700;letter-spacing:-0.2px;
        box-shadow:0 1px 2px rgba(0,0,0,0.4);
      ">${letter}</div>
    </div>
  `.trim();

  return L.divIcon({
    className: `company-marker-wrapper${isHighlighted ? " company-marker-wrapper--highlight" : ""}`,
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 2],
  });
};

/**
 * OSM POI marker: optional `withEnterAnimation` adds a one-shot CSS class for fade/scale (see leaflet-popup-theme.css).
 */
export const getOsmPoiIcon = (isDarkMode = false, withEnterAnimation = false) => {
  const bgColor = isDarkMode ? "#374151" : "white";
  const borderColor = isDarkMode ? "#9ca3af" : "#d1d5db";
  const textColor = isDarkMode ? "white" : "#374151";
  const enterClass = withEnterAnimation ? " osm-poi-inner--enter" : "";

  return L.divIcon({
    className: "osm-poi",
    html: `<div class="osm-poi-inner${enterClass}" style="background-color:${bgColor};width:24px;height:24px;border-radius:50%;border:2px solid ${borderColor};box-shadow:0 2px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:${textColor};font-weight:bold;font-size:12px;">?</div>`,
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
