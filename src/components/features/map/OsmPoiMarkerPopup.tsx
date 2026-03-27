// src/components/features/map/OsmPoiMarkerPopup.tsx
"use client";

import { ExternalLink, MapPin, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { OsmPoiMarkerPopupProps } from "./types";

export default function OsmPoiMarkerPopup({ poi, isDarkMode, onImport, onViewInOsm }: OsmPoiMarkerPopupProps) {
  const name = poi.tags?.name || poi.tags?.["name:de"] || "Unbenannter POI";
  const category = poi.tags?.amenity || poi.tags?.tourism || poi.tags?.leisure || "POI";

  const phone = poi.tags?.phone || poi.tags?.["contact:phone"];
  const website = poi.tags?.website || poi.tags?.["contact:website"];

  const street = poi.tags?.["addr:street"];
  const housenumber = poi.tags?.["addr:housenumber"];
  const postcode = poi.tags?.["addr:postcode"];
  const city = poi.tags?.["addr:city"];

  const address = [street, housenumber].filter(Boolean).join(" ") || "";
  const fullAddress = [address, postcode, city].filter(Boolean).join(", ");

  const osmId = `${poi.type}/${poi.id}`;
  const osmUrl = `https://www.openstreetmap.org/${osmId}`;

  return (
    <div className="min-w-[320px] space-y-4 text-sm p-1">
      {/* Header */}
      <div>
        <div className="font-semibold text-base text-foreground">{name}</div>
        <div className="text-muted-foreground text-xs mt-1 capitalize">{category}</div>
      </div>

      {/* Address */}
      {fullAddress && (
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{fullAddress}</span>
        </div>
      )}

      {/* Phone */}
      {phone && (
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <a href={`tel:${phone}`} className="text-blue-600 dark:text-blue-400 hover:underline">
            {phone}
          </a>
        </div>
      )}

      {/* Website */}
      {website && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">🌐</span>
          <a
            href={website}
            target="_blank"
            rel="noopener"
            className="text-blue-600 dark:text-blue-400 hover:underline truncate"
          >
            Website öffnen
          </a>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-border">
        <Button size="sm" variant="outline" className="flex-1" onClick={() => onViewInOsm?.(osmUrl)}>
          <ExternalLink className="h-4 w-4 mr-2" />
          In OSM ansehen
        </Button>

        <Button size="sm" variant="default" className="flex-1" onClick={() => onImport?.(poi)}>
          In CRM importieren
        </Button>
      </div>
    </div>
  );
}
