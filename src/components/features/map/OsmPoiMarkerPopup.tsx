// src/components/features/map/OsmPoiMarkerPopup.tsx
// This component renders a popup for OSM POI markers on the map, showing details and actions.
// It includes logic to calculate and display water distance info, with caching in the POI object for performance.

"use client";

import { Droplets, ExternalLink, Globe, MapPin, Phone } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/use-translations";
import { getOpenStreetMapUrl } from "@/lib/utils/map-utils";
import type { OsmPoiMarkerPopupProps } from "./types";

export default function OsmPoiMarkerPopup({ poi, onImport }: OsmPoiMarkerPopupProps) {
  const t = useT("openmap");
  const name = poi.tags?.name || poi.tags?.["name:de"] || t("poiUnnamed");
  const category = poi.tags?.amenity || poi.tags?.tourism || poi.tags?.leisure || "POI";

  const phone = poi.tags?.phone || poi.tags?.["contact:phone"];
  const website = poi.tags?.website || poi.tags?.["contact:website"];

  const street = poi.tags?.["addr:street"];
  const housenumber = poi.tags?.["addr:housenumber"];
  const postcode = poi.tags?.["addr:postcode"];
  const city = poi.tags?.["addr:city"];

  const address = [street, housenumber].filter(Boolean).join(" ") || "";
  const fullAddress = [address, postcode, city].filter(Boolean).join(", ");

  let osmId = `${poi.type}/${poi.id}`;
  if (osmId.includes("https://www.openstreetmap.org/")) {
    const parts = osmId.split("/");
    osmId = `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
  }
  const osmUrl = getOpenStreetMapUrl(osmId);

  // Local state for water info (shows cached values immediately)
  const [localWater, _setLocalWater] = useState<{
    distance: number | null;
    wassertyp: string | null;
  } | null>(poi.wasserdistanz !== undefined ? { distance: poi.wasserdistanz, wassertyp: poi.wassertyp ?? null } : null);

  const hasWaterInfo = localWater !== null && localWater.distance !== null;

  const waterDisplayText =
    localWater !== null && localWater.distance !== null
      ? localWater.distance === 0
        ? t("waterAtWater")
        : t("waterDistanceMeters", { meters: String(localWater.distance) })
      : null;

  return (
    <div className="min-w-[min(320px,85vw)] max-w-[min(360px,92vw)] space-y-4 text-sm text-card-foreground p-0.5">
      {/* Header */}
      <div className="space-y-1">
        <div className="font-semibold text-base leading-snug text-foreground">{name}</div>
        <p className="text-muted-foreground text-sm capitalize leading-normal">{category}</p>
      </div>

      {/* Details */}
      <div className="space-y-3">
        {/* Address */}
        {fullAddress && (
          <div className="flex items-start gap-2.5 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="min-w-0 leading-relaxed text-foreground">{fullAddress}</span>
          </div>
        )}

        {/* Phone */}
        {phone && (
          <div className="flex items-center gap-2.5 text-sm">
            <Phone className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <a
              href={`tel:${phone}`}
              className="min-w-0 text-primary underline underline-offset-2 transition-colors hover:text-primary/80"
            >
              {phone}
            </a>
          </div>
        )}

        {/* Website */}
        {website && (
          <div className="flex items-center gap-2.5 text-sm">
            <Globe className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 truncate text-primary underline underline-offset-2 transition-colors hover:text-primary/80"
            >
              {t("poiWebsiteOpen")}
            </a>
          </div>
        )}

        {/* Water Info */}
        {hasWaterInfo && waterDisplayText !== null && (
          <div className="rounded-md border border-border bg-muted/40 p-3 dark:bg-muted/50">
            <div className="flex items-start gap-2.5 text-sm font-medium text-foreground">
              <Droplets className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span className="min-w-0 leading-relaxed">
                {waterDisplayText}
                {localWater.wassertyp && (
                  <span className="font-normal text-muted-foreground"> ({localWater.wassertyp})</span>
                )}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
        <Button size="sm" variant="outline" className="min-h-9 flex-1 border-border bg-background/80 dark:bg-background/50" asChild>
          <a href={osmUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            {t("poiViewInOsm")}
          </a>
        </Button>
        <Button
          size="sm"
          variant="default"
          className="min-h-9 flex-1"
          onClick={() => {
            if (typeof poi.id === "string" && poi.id.startsWith("https://www.openstreetmap.org/")) {
              const parts = poi.id.split("/");
              const lastPart = parts[parts.length - 1];
              if (lastPart) {
                poi.id = lastPart;
              }
            }
            onImport?.(poi);
          }}
        >
          {t("poiImportCrm")}
        </Button>
      </div>
    </div>
  );
}
