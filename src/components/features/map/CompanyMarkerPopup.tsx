// src/components/features/map/CompanyMarkerPopup.tsx
"use client";

import { ExternalLink, Globe, MapPin, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { badgeColors, statusLabels } from "@/lib/constants/map-status-colors";
import { getFirmentypLabel, getKundentypLabel } from "@/lib/utils";

import type { CompanyMarkerPopupProps } from "./types";

export default function CompanyMarkerPopup({ company, onOpenDetail }: CompanyMarkerPopupProps) {
  const statusKey = (company.status?.toLowerCase() || "lead") as keyof typeof badgeColors;
  const statusColor = badgeColors[statusKey] || badgeColors.lead;
  const statusLabel = statusLabels[statusKey] || "Lead";

  // Full address with Straße, PLZ, Stadt, Land
  const addressParts = [company.strasse, company.plz, company.stadt, company.land].filter(Boolean);

  const fullAddress = addressParts.join(", ");

  const kundentypColor = badgeColors[company.kundentyp?.toLowerCase()] || badgeColors.sonstige;
  const wassertypColor = "#22c55e";

  return (
    <div className="min-w-[320px] space-y-4 text-sm p-1">
      {/* Header */}
      <div>
        <div className="font-semibold text-base text-foreground">{company.firmenname}</div>
        {fullAddress && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground mt-1">
            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{fullAddress}</span>
          </div>
        )}
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Status Badge */}
        <div
          className="px-3 py-1 rounded-full text-xs font-medium text-white whitespace-nowrap"
          style={{ backgroundColor: statusColor }}
        >
          {statusLabel}
        </div>

        {/* Kundentyp Badge */}
        <div
          className="px-3 py-1 rounded-full text-xs font-medium text-white whitespace-nowrap"
          style={{ backgroundColor: kundentypColor }}
        >
          <span>{getKundentypLabel(company.kundentyp?.toLowerCase() || "sonstige")}</span>
        </div>

        {/* Wassertyp Badge */}
        {company.wassertyp && (
          <div
            className="px-3 py-1 rounded-full text-xs font-medium text-white whitespace-nowrap"
            style={{ backgroundColor: wassertypColor }}
          >
            💧 {company.wassertyp}
          </div>
        )}

        {company.firmentyp && (
          <div className="text-xs text-muted-foreground">• {getFirmentypLabel(company.firmentyp)}</div>
        )}
      </div>

      {/* Wasserdistanz */}
      {company.wasserdistanz !== null && company.wasserdistanz !== undefined && (
        <div className="text-xs text-muted-foreground">
          {company.wasserdistanz === 0 ? "?" : company.wasserdistanz} m zum Wasser
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
        <Button
          size="sm"
          variant="default"
          className="flex-1"
          onClick={() => window.open(`/companies/${company.id}`, "_blank")}
        >
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
