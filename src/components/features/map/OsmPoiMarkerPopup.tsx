// src/components/features/map/OsmPoiMarkerPopup.tsx
"use client";

import { useState } from "react";

import { ExternalLink, Loader2, MapPin, Phone, Plus, Wifi } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { OsmPoiMarkerPopupProps } from "./types";

export default function OsmPoiMarkerPopup({ poi, isDarkMode, onImport, onViewInOsm }: OsmPoiMarkerPopupProps) {
  const [isImporting, setIsImporting] = useState(false);

  const name = poi.tags?.name || poi.tags?.["name:de"] || "Unbenannter POI";
  const category = poi.tags?.amenity || poi.tags?.tourism || poi.tags?.leisure || "POI";
  const phone = poi.tags?.phone || poi.tags?.["contact:phone"];
  const website = poi.tags?.website || poi.tags?.["contact:website"];
  const street = poi.tags?.["addr:street"];
  const housenumber = poi.tags?.["addr:housenumber"];
  const city = poi.tags?.["addr:city"];
  const postcode = poi.tags?.["addr:postcode"];

  const osmId = `${poi.type}/${poi.id}`;
  const osmUrl = `https://www.openstreetmap.org/${osmId}`;

  const handleImport = async () => {
    setIsImporting(true);
    try {
      await onImport?.(poi);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-w-[320px] space-y-4 text-sm p-1">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-base leading-tight tracking-tight">{name}</div>
          <div className="text-muted-foreground text-xs mt-1 capitalize">{category}</div>
        </div>
      </div>

      {/* Address */}
      {(street || housenumber || city || postcode) && (
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
          <div className="text-muted-foreground">
            {(street || housenumber) && (
              <div>
                {street} {housenumber}
              </div>
            )}
            {(city || postcode) && (
              <div>
                {postcode} {city}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Phone */}
      {phone && (
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <a href={`tel:${phone}`} className="text-blue-600 hover:underline">
            {phone}
          </a>
        </div>
      )}

      {/* Website */}
      {website && (
        <div className="flex items-center gap-2 text-sm">
          <Wifi className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <a href={website} target="_blank" rel="noopener" className="text-blue-600 hover:underline truncate">
            Website öffnen
          </a>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2 pt-3 border-t">
        <Button size="sm" variant="outline" className="flex-1" onClick={() => onViewInOsm?.(osmUrl)}>
          <ExternalLink className="h-4 w-4 mr-2" />
          In OSM ansehen
        </Button>

        <Button
          size="sm"
          variant="default"
          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          onClick={handleImport}
          disabled={isImporting}
        >
          {isImporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importiere...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              In CRM importieren
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
