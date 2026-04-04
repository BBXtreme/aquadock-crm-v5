// src/components/features/map/OsmPoiMarkerPopup.tsx
// This component renders a popup for OSM POI markers on the map, showing details and actions.
// It includes logic to calculate and display water distance info, with caching in the POI object for performance.

"use client";

import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

import { calculateWaterDistance } from "@/lib/utils/calculateWaterDistance";
import { getOpenStreetMapUrl } from "@/lib/utils/map-utils";
import type { OsmPoiMarkerPopupProps } from "./types";

export default function OsmPoiMarkerPopup({ poi, onImport }: OsmPoiMarkerPopupProps) {
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

  let osmId = `${poi.type}/${poi.id}`;
  if (osmId.includes('https://www.openstreetmap.org/')) {
    const parts = osmId.split('/');
    osmId = `${parts[parts.length-2]}/${parts[parts.length-1]}`;
  }
  const osmUrl = getOpenStreetMapUrl(osmId);

  // Local state for water info (shows cached values immediately)
  const [localWater, setLocalWater] = useState<{
    distance: number | null;
    wassertyp: string | null;
  } | null>(poi.wasserdistanz !== undefined ? { distance: poi.wasserdistanz, wassertyp: poi.wassertyp ?? null } : null);

  const hasWaterInfo = localWater !== null && localWater.distance !== null;

  const _handleCalculateWater = async () => {
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
    <div className="min-w-[320px] space-y-4 text-sm p-1">
      {/* Header */}
      <div>
        <div className="font-semibold text-base text-foreground">{name}</div>
        <p className="text-muted-foreground text-sm mt-1 capitalize">{category}</p>
      </div>

      {/* Details */}
      <div className="space-y-3">
        {/* Address */}
        {fullAddress && (
          <div className="flex items-start gap-3 text-sm">
            <span className="text-muted-foreground mt-0.5 flex-shrink-0">📍</span>
            <span className="text-foreground">{fullAddress}</span>
          </div>
        )}

        {/* Phone */}
        {phone && (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground flex-shrink-0">📞</span>
            <a
              href={`tel:${phone}`}
              className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
            >
              {phone}
            </a>
          </div>
        )}

        {/* Website */}
        {website && (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground flex-shrink-0">🌐</span>
            <a
              href={website}
              target="_blank"
              rel="noopener"
              className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors truncate"
            >
              Website öffnen
            </a>
          </div>
        )}

        {/* Water Info */}
        {hasWaterInfo && (
          <div className="bg-muted/50 border border-muted rounded-md p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <span className="text-lg">💧</span>
              <span>
                {localWater.distance === 0 ? "Direkt am Wasser" : `${localWater.distance} m zum Wasser`}
                {localWater.wassertyp && <span className="text-muted-foreground ml-1">({localWater.wassertyp})</span>}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-border">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          asChild
        >
          <a
            href={osmUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            In OSM ansehen
          </a>
        </Button>
        <Button
          size="sm"
          variant="default"
          className="flex-1"
          onClick={() => {
            if (typeof poi.id === 'string' && poi.id.startsWith('https://www.openstreetmap.org/')) {
              const parts = poi.id.split('/');
              poi.id = parts[parts.length-1];
            }
            onImport?.(poi);
          }}
        >
          In CRM importieren
        </Button>
      </div>
    </div>
  );
}
