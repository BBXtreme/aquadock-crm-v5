import L from "leaflet";

export const getStatusIcon = (status?: string) => {
  const colorMap: Record<string, string> = {
    lead: "#f59e0b",
    qualifiziert: "#3b82f6",
    akquise: "#8b5cf6",
    angebot: "#ec4899",
    gewonnen: "#10b981",
    verloren: "#ef4444",
    default: "#6b7280",
  };
  const color = colorMap[status || "default"] || "#6b7280";

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
  const query = `[out:json][timeout:25];(node["amenity"~"restaurant|cafe|bar|hotel|hostel|marina|camp_site"]({{bbox}});way["amenity"~"restaurant|cafe|bar|hotel|hostel|marina|camp_site"]({{bbox}}););out center;`.replace("{{bbox}}", bbox);
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data.elements || [];
  } catch (err) {
    console.warn("[OSM POI] Fetch failed", err);
    return [];
  }
}
