// src/components/features/map/OsmPoiMarkerPopup.tsx
// This component renders a popup for OSM POI markers on the map, showing details and actions.
// It includes logic to calculate and display water distance info, with caching in the POI object for performance.

"use client";

import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

import { calculateWaterDistance } from "@/lib/utils/calculateWaterDistance";
import type { OsmPoiMarkerPopupProps } from "./types";

export default function OsmPoiMarkerPopup({ poi, onImport, onViewInOsm }: OsmPoiMarkerPopupProps) {
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

  // Local state for water info (shows cached values immediately)
  const [localWater, setLocalWater] = useState<{
    distance: number | null;
    wassertyp: string | null;
  } | null>(poi.wasserdistanz !== undefined ? { distance: poi.wasserdistanz, wassertyp: poi.wassertyp ?? null } : null);

  const hasWaterInfo = localWater !== null && localWater.distance !== null;

  const handleCalculateWater = async () => {
    if (hasWaterInfo) return;

    const lat = poi.lat || poi.center?.lat;
    const lon = poi.lon || poi.center?.lon;

    if (!lat || !lon) {
      toast.error("Keine Koordinaten für Wasserberechnung verfügbar");
      return;
    }

    toast.loading("Wasser-Info wird berechnet...", { id: "water-calc" });

    try {
      const result = await calculateWaterDistance(lat, lon);

      // Update both local state and original POI object
      setLocalWater(result);
      Object.assign(poi, {
        wasserdistanz: result.distance,
        wassertyp: result.wassertyp,
      });

      if (result.distance !== null) {
        const msg = result.distance === 0 ? "Direkt am Wasser" : `${result.distance} m zum Wasser`;
        toast.success(msg, { id: "water-calc" });
      } else {
        toast.error("Kein Wasser in der Nähe gefunden", { id: "water-calc" });
      }
    } catch (_error) {
      toast.error("Fehler bei der Wasserberechnung. Bitte später erneut versuchen.", { id: "water-calc" });
    }
  };

  return (
    <div className="min-w-[380px] space-y-3 text-sm p-3">
      {/* Header */}
      <div>
        <div className="font-semibold text-base text-foreground">{name}</div>
        <div className="text-muted-foreground text-xs mt-1 capitalize">{category}</div>
      </div>

      {/* Address */}
      {fullAddress && (
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <span className="text-muted-foreground mt-0.5">📍</span>
          <span>{fullAddress}</span>
        </div>
      )}

      {/* Phone */}
      {phone && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">📞</span>
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

      {/* Water Info - Prominent muted box */}
      {hasWaterInfo && (
        <div className="bg-muted/50 border border-muted rounded-md p-3 text-sm">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <span className="text-lg">💧</span>
            <span>
              {localWater.distance === 0 ? "Direkt am Wasser" : `${localWater.distance} m zum Wasser`}
              {localWater.wassertyp && <span className="text-muted-foreground ml-1">({localWater.wassertyp})</span>}
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2 pt-2 border-t border-border">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" onClick={() => onViewInOsm?.(osmUrl)}>
            <ExternalLink className="h-4 w-4 mr-2" />
            In OSM ansehen
          </Button>

          <Button size="sm" variant="default" className="flex-1" onClick={() => onImport?.(poi)}>
            In CRM importieren
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={handleCalculateWater}
            disabled={hasWaterInfo}
            type="button"
          >
            {hasWaterInfo ? "✅ Wasser-Info vorhanden" : "💧 Wasser-Info berechnen"}
          </Button>
        </div>
      </div>
    </div>
  );
}
