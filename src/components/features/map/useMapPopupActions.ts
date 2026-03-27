// src/components/features/map/useMapPopupActions.ts
"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { toast } from "sonner";
import { determineFirmentyp, determineKundentyp } from "@/lib/constants/kundentyp";
import { determineWassertyp } from "@/lib/constants/wassertyp";
import { createClient } from "@/lib/supabase/browser";
import { calculateWaterDistance } from "@/lib/utils/calculateWaterDistance";

import type { OsmPoi } from "./types";

async function createCompanyFromOsmPoi(poi: OsmPoi, userId: string) {
  const name = poi.tags?.name || poi.tags?.["name:de"] || "Unbenannter POI";

  // Filter out undefined values to match expected type
  const tags = Object.fromEntries(Object.entries(poi.tags || {}).filter(([_, v]) => v !== undefined)) as Record<
    string,
    string
  >;

  const kundentyp = determineKundentyp(tags) || "sonstige";
  const firmentyp = determineFirmentyp(tags);
  const wassertyp = determineWassertyp(tags) || "";

  const formData = {
    firmenname: name,
    kundentyp,
    firmentyp,
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
    user_id: userId || null, // Explicitly set to null if no userId
    value: 0,
    wassertyp: poi.wassertyp ?? wassertyp,
    wasserdistanz: poi.wasserdistanz ?? null,
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
    console.error("❌ API Response Error - Full response:", {
      status: res.status,
      statusText: res.statusText,
      data: responseData,
      fullError: responseData.details || responseData.error || "Unknown error",
    });
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

  const calculateWaterForPoi = useCallback(async (poi: OsmPoi) => {
    const lat = poi.lat || poi.center?.lat;
    const lon = poi.lon || poi.center?.lon;
    if (!lat || !lon) {
      toast.error("Keine Koordinaten für Wasserberechnung");
      return;
    }
    toast.loading("Wasser-Info wird berechnet...", { id: "water-calc" });
    try {
      const { distance, wassertyp } = await calculateWaterDistance(lat, lon);
      Object.assign(poi, { wasserdistanz: distance, wassertyp });
      console.log(`Calculated water distance: ${distance}m, type: ${wassertyp} for POI ${poi.id}`);
      if (distance !== null) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        toast.success(`Wasser-Info berechnet: ${distance} m`, { id: "water-calc" });
      } else {
        toast.error("Kein Wasser in der Nähe gefunden", { id: "water-calc" });
      }
    } catch (_error) {
      toast.error("Fehler bei Wasserberechnung", { id: "water-calc" });
    }
  }, []);

  const importOsmPoi = async (poi: OsmPoi) => {
    const name = poi.tags?.name || "POI";

    try {
      toast.loading(`"${name}" wird importiert...`, { id: "osm-import" });

      // Always use mock user ID for now
      const userId = "dev-mock-user-11111111-2222-3333-4444-555555555555";

      // Check for duplicate by OSM URL
      const osmUrl = `https://www.openstreetmap.org/${poi.type}/${poi.id}`;
      const supabase = createClient();
      const { data: existingCompanies, error: fetchError } = await supabase
        .from("companies")
        .select("id, firmenname")
        .eq("osm", osmUrl)
        .limit(1);

      if (fetchError) {
        console.warn("Failed to check for duplicates:", fetchError);
      } else if (existingCompanies && existingCompanies.length > 0) {
        const existing = existingCompanies[0];
        if (existing) {
          toast.error(`"${name}" ist bereits importiert`, {
            id: "osm-import",
            description: `Firma "${existing.firmenname}" existiert bereits.`,
            action: {
              label: "Firma öffnen",
              onClick: () => openCompanyDetail(existing.id),
            },
          });
        }
        return;
      }

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

      // Dispatch event to refresh company markers
      window.dispatchEvent(new CustomEvent("company-imported"));
    } catch (err: unknown) {
      console.error("Import failed:", err);
      toast.error(`Import von "${name}" fehlgeschlagen`, {
        id: "osm-import",
        description: err instanceof Error ? err.message : "Unbekannter Fehler",
      });
    }
  };

  return { openCompanyDetail, importOsmPoi, viewInOsm, calculateWaterForPoi };
}
