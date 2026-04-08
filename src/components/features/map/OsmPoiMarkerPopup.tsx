// src/components/features/map/OsmPoiMarkerPopup.tsx
// This component renders a popup for OSM POI markers on the map, showing details and actions.
// It includes logic to calculate and display water distance info, with caching in the POI object for performance.

"use client";

import { Droplets, ExternalLink, Globe, MapPin, Phone } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
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

  const hasDetailsSection = Boolean(fullAddress || phone || website || hasWaterInfo);

  const actionButtonClass =
    "flex h-auto min-h-10 w-full flex-row items-center justify-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-medium leading-snug [&_svg]:shrink-0";

  return (
    <div className="box-border w-full max-w-full min-w-[min(288px,100%)] space-y-5 p-0 text-sm text-card-foreground">
      <div className="space-y-2.5 pr-1">
        <div className="text-balance font-semibold text-base leading-snug tracking-tight text-foreground">{name}</div>
        <Badge variant="secondary" className="h-auto max-w-full min-w-0 justify-start whitespace-normal rounded-lg px-2.5 py-1 text-left text-xs capitalize leading-snug">
          {category}
        </Badge>
      </div>

      {hasDetailsSection && (
        <div className="space-y-2.5">
          {fullAddress && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 leading-relaxed">{fullAddress}</span>
            </div>
          )}

          {phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <a
                href={`tel:${phone}`}
                className="min-w-0 font-medium text-primary underline underline-offset-2 transition-colors hover:text-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {phone}
              </a>
            </div>
          )}

          {website && (
            <div className="flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <a
                href={website}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 truncate font-medium text-primary underline underline-offset-2 transition-colors hover:text-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {t("poiWebsiteOpen")}
              </a>
            </div>
          )}

          {hasWaterInfo && waterDisplayText !== null && (
            <div className="flex items-start gap-2 text-sm font-medium text-foreground">
              <Droplets className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span className="min-w-0 leading-relaxed">
                {waterDisplayText}
                {localWater.wassertyp && (
                  <span className="font-normal text-muted-foreground"> ({localWater.wassertyp})</span>
                )}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2.5 border-t border-border/80 pt-4">
          <Button size="default" variant="outline" className={actionButtonClass} asChild type="button">
            <a href={osmUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" aria-hidden />
              <span className="min-w-0 max-w-full truncate text-center">{t("poiViewInOsm")}</span>
            </a>
          </Button>
          <Button
            size="default"
            variant="default"
            className={actionButtonClass}
            type="button"
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
            <span className="min-w-0 max-w-full truncate text-center">{t("poiImportCrm")}</span>
          </Button>
      </div>
    </div>
  );
}
