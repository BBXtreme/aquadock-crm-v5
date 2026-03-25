// src/components/features/map/CompanyMarkerPopup.tsx
"use client";

import { ExternalLink, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { statusColors, statusLabels } from "@/lib/constants/map-status-colors";

import type { CompanyMarkerPopupProps } from "./types";

export default function CompanyMarkerPopup({ company, onOpenDetail }: CompanyMarkerPopupProps) {
  const statusKey = (company.status?.toLowerCase() || "lead") as keyof typeof statusColors;
  const statusColor = statusColors[statusKey] || statusColors.lead;
  const statusLabel = statusLabels[statusKey] || "Lead";

  return (
    <div className="min-w-[320px] space-y-4 text-sm p-4 bg-card/90 backdrop-blur-sm border rounded-md shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-base leading-tight tracking-tight text-foreground">{company.firmenname}</div>
          <div className="text-muted-foreground text-xs mt-1">
            {company.stadt}, {company.land}
          </div>
        </div>

        <div
          className="px-3 py-1 rounded-full text-xs font-medium text-white whitespace-nowrap flex-shrink-0"
          style={{ backgroundColor: statusColor }}
        >
          {statusLabel}
        </div>
      </div>

      {/* Value */}
      {company.value && company.value > 0 && (
        <div className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
          €{company.value.toLocaleString("de-DE")}
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
