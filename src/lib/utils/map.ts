import L from "leaflet";

import { poiCategories } from "@/lib/constants/map-poi-config";
import { statusColors } from "@/lib/constants/status-colors";

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

export const getOsmPoiIcon = () => {
  return L.divIcon({
    className: "osm-poi",
    html: `
      <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="14" fill="#22c55e" stroke="#ffffff" stroke-width="3"/>
        <circle cx="16" cy="16" r="6" fill="#ffffff" />
      </svg>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20],
  });
};

export async function fetchOsmPois(bounds: L.LatLngBounds, activeCategories: string[] = Object.keys(poiCategories)): Promise<any[]> {
  const bbox = bounds.toBBoxString(); // "west,south,east,north"
  const [west, south, east, north] = bbox.split(",").map(Number);
  const overpassBbox = `${south},${west},${north},${east}`; // "south,west,north,east"

  // Build tag groups from active poiCategories
  const tagGroups: Record<string, string[]> = {};
  const activePoiCategories = activeCategories.reduce((acc, key) => {
    if (poiCategories[key]) acc[key] = poiCategories[key];
    return acc;
  }, {} as typeof poiCategories);

  for (const category of Object.values(activePoiCategories)) {
    for (const tag of category.osmTags) {
      const [key, value] = tag.split("=");
      if (!tagGroups[key]) tagGroups[key] = [];
      tagGroups[key].push(value);
    }
  }

  // Create conditions for each tag group
  const conditions = Object.entries(tagGroups).map(([key, values]) => `["${key}"~"${values.join("|")}"](${overpassBbox})`);

  const query = `
    [out:json][timeout:45];
    (
${conditions.map(cond => `      node${cond};`).join("\n")}
${conditions.map(cond => `      way${cond};`).join("\n")}
    );
    out center;
  `;

  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass.osm.ch/api/interpreter",
  ];

  for (const endpoint of endpoints) {
    try {
      const url = `${endpoint}?data=${encodeURIComponent(query)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 50000); // 50s timeout for fetch

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        if (res.status === 504) {
          console.warn(`[OpenMap OSM] ${endpoint} returned 504, trying next...`);
          continue;
        }
        throw new Error(`Overpass API Fehler: ${res.status}`);
      }

      const data = await res.json();
      console.log(`[OpenMap OSM] Fetched ${data.elements?.length || 0} POIs from ${endpoint}`);
      return data.elements || [];
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.warn(`[OpenMap OSM] ${endpoint} timed out, trying next...`);
        continue;
      }
      console.error(`[OpenMap OSM] ${endpoint} failed:`, err);
      if (endpoint === endpoints[endpoints.length - 1]) {
        throw err; // last one, throw
      }
    }
  }

  throw new Error("All Overpass endpoints failed");
}
