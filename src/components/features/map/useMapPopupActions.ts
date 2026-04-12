// src/components/features/map/useMapPopupActions.ts
// This hook provides action handlers for map popups, such as importing OSM POIs as companies, viewing in OSM, calculating water distance, and opening company details. It integrates with the Supabase backend and uses react-query for cache management.

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { toast } from "sonner";
import { COMPANY_IMPORT_SOURCE_HEADER, COMPANY_IMPORT_SOURCE_OSM_POI } from "@/lib/constants/company-import-source";
import { determineFirmentyp, determineKundentyp } from "@/lib/constants/map-kundentyp";
import { determineWassertyp } from "@/lib/constants/wassertyp";
import { useNumberLocaleTag, useT } from "@/lib/i18n/use-translations";
import { createClient } from "@/lib/supabase/browser";
import { calculateWaterDistance } from "@/lib/utils/calculateWaterDistance";

import type { OsmPoi } from "./types";

async function createCompanyFromOsmPoi(poi: OsmPoi, userId: string | null, displayName: string, notes: string) {
  const name = displayName;

  // Filter out undefined values to match expected type
  const tags = Object.fromEntries(Object.entries(poi.tags || {}).filter(([_, v]) => v !== undefined)) as Record<
    string,
    string
  >;

  const kundentyp = determineKundentyp(tags) || "sonstige";
  const firmentyp = determineFirmentyp(tags);
  const wassertyp = determineWassertyp(tags) || "";

  // Extract short ID from poi.id (handle full URL if present)
  let osmId = poi.id;
  if (typeof osmId === "string" && osmId.startsWith("https://www.openstreetmap.org/")) {
    const parts = osmId.split("/");
    osmId = parts[parts.length - 1] as string;
  }

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
    osm: `${poi.type}/${osmId}`,
    user_id: userId || null,
    value: 0,
    wassertyp: poi.wassertyp ?? wassertyp,
    wasserdistanz: poi.wasserdistanz ?? null,
    notes,
  };

  const res = await fetch("/api/companies", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [COMPANY_IMPORT_SOURCE_HEADER]: COMPANY_IMPORT_SOURCE_OSM_POI,
    },
    body: JSON.stringify(formData),
  });

  const responseData = await res.json().catch(() => ({}));

  if (!res.ok || !responseData.success) {
    console.error("API Response Error - Full response:", {
      status: res.status,
      statusText: res.statusText,
      data: responseData,
      fullError: responseData.details || responseData.error || "Unknown error",
    });
    throw new Error(responseData.error || `HTTP ${res.status} - ${JSON.stringify(responseData)}`);
  }

  return responseData;
}

export function useMapPopupActions() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useT("openmap");
  const localeTag = useNumberLocaleTag();

  const openCompanyDetail = (cid: string, options?: { aiEnrich?: boolean }) => {
    const suffix = options?.aiEnrich ? "?aiEnrich=1" : "";
    router.push(`/companies/${cid}${suffix}`);
  };

  const viewInOsm = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const calculateWaterForPoi = useCallback(
    async (poi: OsmPoi) => {
      const lat = poi.lat || poi.center?.lat;
      const lon = poi.lon || poi.center?.lon;
      if (!lat || !lon) {
        toast.error(t("waterCalcNoCoords"));
        return;
      }
      toast.loading(t("waterCalcLoading"), { id: "water-calc" });
      try {
        const result = await calculateWaterDistance(lat, lon);
        Object.assign(poi, { wasserdistanz: result.distance, wassertyp: result.wassertyp });
        if (result.distance !== null) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          const msg =
            result.distance === 0
              ? t("waterAtWater")
              : t("waterDistanceMeters", { meters: String(result.distance) });
          toast.success(msg, { id: "water-calc" });
        } else {
          toast.error(t("waterNotFound"), { id: "water-calc" });
        }
      } catch (_error) {
        toast.error(t("waterCalcError"), { id: "water-calc" });
      }
    },
    [t],
  );

  const importOsmPoi = async (poi: OsmPoi) => {
    const displayName = poi.tags?.name || poi.tags?.["name:de"] || t("poiUnnamed");
    const importNotes = t("importNotes", { date: new Date().toLocaleDateString(localeTag) });

    try {
      toast.loading(t("importLoading", { name: displayName }), { id: "osm-import" });

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id ?? null;

      const osmUrl = `https://www.openstreetmap.org/${poi.type}/${poi.id}`;
      const { data: existingCompanies, error: fetchError } = await supabase
        .from("companies")
        .select("id, firmenname")
        .eq("osm", osmUrl)
        .is("deleted_at", null)
        .limit(1);

      if (fetchError) {
        console.warn("Failed to check for duplicates:", fetchError);
      } else if (existingCompanies && existingCompanies.length > 0) {
        const existing = existingCompanies[0];
        if (existing) {
          toast.error(t("importDuplicateTitle", { name: displayName }), {
            id: "osm-import",
            description: t("importDuplicateDescription", { firmenname: existing.firmenname }),
            action: {
              label: t("popupOpenCompany"),
              onClick: () => openCompanyDetail(existing.id),
            },
          });
        }
        return;
      }

      const result = await createCompanyFromOsmPoi(poi, userId, displayName, importNotes);

      const newCompanyId = result.id;

      if (!newCompanyId) {
        throw new Error(t("unknownError"));
      }

      toast.success(t("importSuccessTitle", { name: displayName }), {
        id: "osm-import",
        description: t("importSuccessDescription"),
        action: {
          label: t("popupOpenCompany"),
          onClick: () => openCompanyDetail(newCompanyId, { aiEnrich: true }),
        },
      });

      window.dispatchEvent(new CustomEvent("company-imported"));

      queryClient.invalidateQueries({ queryKey: ["companies"] });
    } catch (err: unknown) {
      console.error("Import failed:", err);
      toast.error(t("importFailedTitle", { name: displayName }), {
        id: "osm-import",
        description: err instanceof Error ? err.message : t("unknownError"),
      });
    }
  };

  return { openCompanyDetail, importOsmPoi, viewInOsm, calculateWaterForPoi };
}
