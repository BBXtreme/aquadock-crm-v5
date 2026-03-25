// src/components/features/map/OsmPoiMarkerPopup.tsx
"use client";

import { ExternalLink, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { OsmPoiMarkerPopupProps } from "./types";

export default function OsmPoiMarkerPopup({ poi, isDarkMode, onImport, onViewInOsm }: OsmPoiMarkerPopupProps) {
  const name = poi.tags?.name || poi.tags?.["name:de"] || "Unbenannter POI";
  const category = poi.tags?.amenity || poi.tags?.tourism || poi.tags?.leisure || "POI";
  const phone = poi.tags?.phone || poi.tags?.["contact:phone"];
  const website = poi.tags?.website || poi.tags?.["contact:website"];

  const osmId = `${poi.type}/${poi.id}`;
  const osmUrl = `https://www.openstreetmap.org/${osmId}`;

  return (
    <div className="min-w-[300px] space-y-4 text-sm">
      <div>
        <div className="font-semibold text-base">{name}</div>
        <div className="text-xs text-muted-foreground mt-1 capitalize">{category}</div>
      </div>

      {phone && (
        <div className="text-sm">
          📞{" "}
          <a href={`tel:${phone}`} className="text-blue-600 hover:underline">
            {phone}
          </a>
        </div>
      )}

      {website && (
        <div className="text-sm">
          🌐{" "}
          <a href={website} target="_blank" rel="noopener" className="text-blue-600 hover:underline">
            Website öffnen
          </a>
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t">
        <Button size="sm" variant="outline" className="flex-1" onClick={() => onViewInOsm?.(osmUrl)}>
          <ExternalLink className="h-4 w-4 mr-2" />
          In OSM ansehen
        </Button>

        <Button
          size="sm"
          variant="default"
          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
          onClick={() => onImport?.(poi)}
        >
          <Plus className="h-4 w-4 mr-2" />
          In CRM importieren
        </Button>
      </div>
    </div>
  );
}
