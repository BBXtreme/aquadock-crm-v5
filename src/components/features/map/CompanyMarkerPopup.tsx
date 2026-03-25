// src/components/features/map/CompanyMarkerPopup.tsx
"use client";

import { ExternalLink, Globe, MapPin, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { statusColors, statusLabels } from "@/lib/constants/map-status-colors";

import type { CompanyMarkerPopupProps } from "./types";

export default function CompanyMarkerPopup({ company, onOpenDetail }: CompanyMarkerPopupProps) {
  const statusKey = (company.status?.toLowerCase() || "lead") as keyof typeof statusColors;
  const statusColor = statusColors[statusKey] || statusColors.lead;
  const statusLabel = statusLabels[statusKey] || "Lead";

  // Kundentyp with emoji
  const kundentypEmoji: Record<string, string> = {
    restaurant: "🍽️",
    hotel: "🏨",
    marina: "⚓",
    camping: "🏕️",
    bootsverleih: "⛵",
    segelschule: "⛵",
    resort: "🌴",
  };

  const emoji = kundentypEmoji[company.kundentyp?.toLowerCase()] || "🏢";

  // Address
  const addressLine = [company.stadt, company.land].filter(Boolean).join(", ");

  return (
    <div className="min-w-[340px] space-y-4 text-sm p-1">
      {/* Header */}
      <div>
        <div className="font-semibold text-base text-foreground">{company.firmenname}</div>
        {addressLine && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground mt-1">
            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{addressLine}</span>
          </div>
        )}
      </div>

      {/* Kundentyp Badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-muted/70 rounded-full text-xs font-medium">
          <span>{emoji}</span>
          <span>{company.kundentyp || "Sonstige"}</span>
        </div>

        {company.firmentyp && <div className="text-xs text-muted-foreground">• {company.firmentyp}</div>}
      </div>

      {/* Water Information */}
      {(company.wassertyp || company.wasserdistanz) && (
        <div className="flex items-center gap-3 text-xs">
          {company.wassertyp && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 rounded-full">
              💧 {company.wassertyp}
            </div>
          )}
          {company.wasserdistanz && <div className="text-muted-foreground">{company.wasserdistanz} m zum Wasser</div>}
        </div>
      )}

      {/* Phone */}
      {company.telefon && (
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <a href={`tel:${company.telefon}`} className="text-blue-600 dark:text-blue-400 hover:underline">
            {company.telefon}
          </a>
        </div>
      )}

      {/* Website */}
      {company.website && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">🌐</span>
          <a
            href={company.website}
            target="_blank"
            rel="noopener"
            className="text-blue-600 dark:text-blue-400 hover:underline truncate"
          >
            Website öffnen
          </a>
        </div>
      )}

      {/* OSM Link */}
      {company.osm && (
        <div className="text-xs">
          <a
            href={company.osm}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline"
          >
            <Globe className="h-3.5 w-3.5" />
            OpenStreetMap Eintrag
          </a>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2 pt-3 border-t border-border">
        <Button size="sm" variant="default" className="flex-1" onClick={() => onOpenDetail?.(company.id)}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Firma öffnen
        </Button>

        {company.telefon && (
          <Button size="sm" variant="outline" asChild>
            <a href={`tel:${company.telefon}`} title="Anrufen">
              <Phone className="h-4 w-4" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
