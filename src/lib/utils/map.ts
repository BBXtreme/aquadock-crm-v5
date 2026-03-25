import L from "leaflet";

import { poiCategories } from "@/lib/constants/map-poi-config";
import { statusColors } from "@/lib/constants/status-colors";

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
    html: `<div style="background-color:${bgColor};width:32px;height:32px;border-radius:50%;border:3px solid ${borderColor};box-shadow:0 3px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:${textColor};font-weight:bold;font-size:14px;">?</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20],
  });
};

export async function fetchOsmPois(
  bounds: L.LatLngBounds,
  activeCategories: string[] = Object.keys(poiCategories),
): Promise<{ pois: any[]; totalFound: number }> {
  if (poiFetchTimeout) clearTimeout(poiFetchTimeout);

  return new Promise((resolve, reject) => {
    poiFetchTimeout = setTimeout(async () => {
      console.group("OpenMap OSM Query");
      console.log("Current bounds:", bounds.toBBoxString());
      console.log("Active categories:", activeCategories);

      const bbox = bounds.toBBoxString(); // "west,south,east,north"
      const [west, south, east, north] = bbox.split(",").map(Number);
      const overpassBbox = `${south},${west},${north},${east}`; // "south,west,north,east"

      // Build tag groups from active poiCategories
      const tagGroups: Record<string, string[]> = {};
      const activePoiCategories = activeCategories.reduce(
        (acc, key) => {
          if (poiCategories[key]) acc[key] = poiCategories[key];
          return acc;
        },
        {} as typeof poiCategories,
      );

      for (const category of Object.values(activePoiCategories)) {
        for (const tag of category.tags) {
          if (tag.includes("=")) {
            const [key, value] = tag.split("=");
            if (!tagGroups[key]) tagGroups[key] = [];
            tagGroups[key].push(value);
          } else {
            // assume amenity
            if (!tagGroups["amenity"]) tagGroups["amenity"] = [];
            tagGroups["amenity"].push(tag);
          }
        }
      }

      // Create conditions for each tag group
      const conditions = Object.entries(tagGroups).map(
        ([key, values]) => `["${key}"~"${values.join("|")}"](${overpassBbox})`,
      );

      const query = `
        [out:json][timeout:45][maxsize:500k];
        (
${conditions.map((cond) => `      node${cond};`).join("\n")}
${conditions.map((cond) => `      way${cond};`).join("\n")}
        );
        out center;
      `;

      console.log("Final query string:", query);

      const endpoints = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
      ];

      // Basic deduplication by OSM ID
      const seen = new Set<string>();

      for (const endpoint of endpoints) {
        console.log(`[OpenMap OSM] Trying ${endpoint}`);
        let retries = 0;
        const maxRetries = 2;

        while (retries < maxRetries) {
          try {
            const url = `${endpoint}?data=${encodeURIComponent(query)}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s max

            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (res.ok) {
              const data = await res.json();
              const deduplicated = (data.elements || []).filter((poi: any) => {
                const key = `${poi.type}/${poi.id}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              });

              console.groupEnd();
              resolve({ pois: deduplicated, totalFound: deduplicated.length });
              return;
            }

            if (res.status === 429) {
              retries++;
              const delay = 2 ** retries * 1200;
              await new Promise((r) => setTimeout(r, delay));
            } else if (res.status === 403 || res.status === 504) {
              console.warn(`[OpenMap OSM] ${endpoint} ${res.status} - skipping`);
              break;
            } else {
              console.warn(`[OpenMap OSM] ${endpoint} error ${res.status}`);
              break;
            }
          } catch (err: any) {
            if (err.name === "AbortError") {
              console.warn(`[OpenMap OSM] ${endpoint} timeout`);
              break;
            }
            if (endpoint === endpoints[endpoints.length - 1]) {
              console.groupEnd();
              console.error("All Overpass endpoints failed");
              resolve({ pois: [], totalFound: 0 }); // silent fail
              return;
            }
            break;
          }
        }
      }

      console.groupEnd();
      resolve({ pois: [], totalFound: 0 }); // silent fail
    }, 300);
  });
}
