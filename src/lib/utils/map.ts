import L from "leaflet";

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

export async function fetchOsmPois(bounds: L.LatLngBounds): Promise<any[]> {
  const bbox = bounds.toBBoxString();

  const query = `
    [out:json][timeout:25];
    (
      node["amenity"~"restaurant|cafe|bar|hotel|hostel|camp_site|marina|boat_rental"]({{bbox}});
      way["amenity"~"restaurant|cafe|bar|hotel|hostel|camp_site|marina|boat_rental"]({{bbox}});
    );
    out center;
  `.replace("{{bbox}}", bbox);

  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Overpass API error: ${res.status}`);

    const data = await res.json();
    console.log(`[OpenMap OSM] Fetched ${data.elements?.length || 0} POIs`);

    return data.elements || [];
  } catch (err) {
    console.error("[OpenMap OSM] Fetch failed:", err);
    return [];
  }
}
