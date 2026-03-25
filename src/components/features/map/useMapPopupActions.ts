// src/components/features/map/useMapPopupActions.ts
"use client";

import { useRouter } from "next/navigation";

import { toast } from "sonner";

import type { OsmPoi } from "./types";

async function createCompanyFromOsmPoi(poi: OsmPoi, userId: string) {
  const name = poi.tags?.name || poi.tags?.["name:de"] || "Unbenannter POI";

  const kundentypMap: Record<string, string> = {
    restaurant: "restaurant",
    cafe: "restaurant",
    bar: "restaurant",
    hotel: "hotel",
    hostel: "hotel",
    camp_site: "camping",
    marina: "marina",
    harbor: "marina",
    boat_rental: "bootsverleih",
  };

  let kundentyp = "sonstige";
  const amenity = (poi.tags?.amenity || poi.tags?.tourism || poi.tags?.leisure || "").toLowerCase();
  for (const [key, value] of Object.entries(kundentypMap)) {
    if (amenity.includes(key)) {
      kundentyp = value;
      break;
    }
  }

  const formData = {
    firmenname: name,
    kundentyp,
    status: "lead",
    strasse: poi.tags?.["addr:street"] || "",
    plz: poi.tags?.["addr:postcode"] || "",
    stadt: poi.tags?.["addr:city"] || "",
    land: poi.tags?.["addr:country"] === "DE" ? "Deutschland" : poi.tags?.["addr:country"] || "Deutschland",
    telefon: poi.tags?.phone || poi.tags?.["contact:phone"] || "",
    website: poi.tags?.website || poi.tags?.["contact:website"] || "",
    lat: (poi.lat || poi.center?.lat) as number,
    lon: (poi.lon || poi.center?.lon) as number,
    osm: `https://www.openstreetmap.org/${poi.type}/${poi.id}`,
    user_id: userId, // Now required
    value: 0,
    notes: `Importiert aus OSM am ${new Date().toLocaleDateString("de-DE")}`,
  };

  console.log("📤 Sending to /api/companies:", formData); // ← hilft beim Debuggen

  const res = await fetch("/api/companies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });

  const responseData = await res.json().catch(() => ({}));

  if (!res.ok || !responseData.success) {
    console.error("❌ API Response Error - Full response:", { status: res.status, statusText: res.statusText, data: responseData });
    throw new Error(responseData.error || `HTTP ${res.status} - ${JSON.stringify(responseData)}`);
  }

  console.log("✅ Import successful:", responseData);
  return responseData;
}

export function useMapPopupActions() {
  const router = useRouter();

  const openCompanyDetail = (id: string) => {
    router.push(`/companies/${id}`);
  };

  const viewInOsm = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const importOsmPoi = async (poi: OsmPoi) => {
    const name = poi.tags?.name || "POI";

    try {
      toast.loading(`"${name}" wird importiert...`, { id: "osm-import" });

      // Get user ID from auth context or API
      const userRes = await fetch("/api/auth/user");
      if (!userRes.ok) throw new Error("Authentication required");
      const { userId } = await userRes.json();

      const result = await createCompanyFromOsmPoi(poi, userId);

      // Sichere ID-Extraktion – funktioniert mit verschiedenen API-Antwort-Formaten
      const newCompanyId = result.id;

      if (!newCompanyId) {
        throw new Error("Keine Firmen-ID zurückgegeben");
      }

      toast.success(`✅ "${name}" erfolgreich angelegt!`, {
        id: "osm-import",
        description: "Firma ist jetzt in der Liste verfügbar.",
        action: {
          label: "Firma öffnen",
          onClick: () => openCompanyDetail(newCompanyId),
        },
      });

      window.dispatchEvent(new CustomEvent("osm-poi-imported"));
    } catch (err: any) {
      console.error("Import failed:", err);
      toast.error(`Import von "${name}" fehlgeschlagen`, {
        id: "osm-import",
        description: err.message || "Unbekannter Fehler",
      });
    }
  };

  return { openCompanyDetail, importOsmPoi, viewInOsm };
}
