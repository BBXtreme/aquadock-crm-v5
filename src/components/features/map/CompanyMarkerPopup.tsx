// src/components/features/map/CompanyMarkerPopup.tsx
// This component renders a popup for company markers on the map, showing details and actions.

"use client";

import { Droplets, ExternalLink, Globe, Mail, MapPin, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { badgeColors } from "@/lib/constants/map-status-colors";
import { getOpenmapStatusMsgKey } from "@/lib/i18n/openmap-status";
import { useT } from "@/lib/i18n/use-translations";
import { getFirmentypLabel, getKundentypLabel } from "@/lib/utils";
import { getOpenStreetMapUrl } from "@/lib/utils/map-utils";

import type { CompanyMarkerPopupProps } from "./types";

export default function CompanyMarkerPopup({ company }: CompanyMarkerPopupProps) {
  const t = useT("openmap");
  const statusKey = (company.status?.toLowerCase() || "lead") as keyof typeof badgeColors;
  const statusColor = badgeColors[statusKey] || badgeColors.lead;
  const statusLabel = t(getOpenmapStatusMsgKey(statusKey));

  // Full address
  const addressParts = [company.strasse, company.plz, company.stadt, company.land].filter(Boolean);
  const fullAddress = addressParts.join(", ");

  const kundentypColor = badgeColors[company.kundentyp?.toLowerCase()] || badgeColors.sonstige;
  const wassertypColor = "#22c55e";

  // Website with https:// fallback
  const websiteUrl = company.website
    ? company.website.startsWith("http")
      ? company.website
      : `https://${company.website}`
    : null;

  const waterLine =
    company.wasserdistanz !== null && company.wasserdistanz !== undefined
      ? company.wasserdistanz === 0
        ? t("waterAtWater")
        : t("waterDistanceMeters", { meters: String(company.wasserdistanz) })
      : null;

  const hasMetaBlock = Boolean(company.firmentyp) || waterLine !== null;
  const hasContactBlock = Boolean(company.email || company.website || company.osm);

  return (
    <div className="min-w-[min(320px,85vw)] max-w-[min(360px,92vw)] space-y-4 text-sm text-card-foreground p-0.5">
      {/* Header */}
      <div className="space-y-1">
        <div className="font-semibold text-base leading-snug text-foreground">{company.firmenname}</div>
        {fullAddress && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span className="min-w-0 leading-relaxed">{fullAddress}</span>
          </div>
        )}
      </div>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium text-white shadow-sm ring-1 ring-black/10 dark:ring-white/15"
          style={{ backgroundColor: statusColor }}
        >
          {statusLabel}
        </div>

        <div
          className="whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium text-white shadow-sm ring-1 ring-black/10 dark:ring-white/15"
          style={{ backgroundColor: kundentypColor }}
        >
          {getKundentypLabel(company.kundentyp?.toLowerCase() || "sonstige")}
        </div>

        {company.wassertyp && (
          <div
            className="flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium text-white shadow-sm ring-1 ring-black/10 dark:ring-white/15"
            style={{ backgroundColor: wassertypColor }}
          >
            <Droplets className="h-3.5 w-3.5 opacity-95" aria-hidden />
            {company.wassertyp}
          </div>
        )}
      </div>

      {hasMetaBlock && (
        <div className="space-y-1.5 rounded-md border border-border bg-muted/40 p-3 dark:bg-muted/50">
          {company.firmentyp && (
            <div className="text-xs leading-relaxed text-muted-foreground">{getFirmentypLabel(company.firmentyp)}</div>
          )}
          {waterLine !== null && (
            <div className="flex items-start gap-2 text-xs font-medium text-foreground">
              <Droplets className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
              <span className="min-w-0 leading-relaxed">{waterLine}</span>
            </div>
          )}
        </div>
      )}

      {hasContactBlock && (
        <div className="space-y-2.5 rounded-md border border-border bg-muted/25 p-3 dark:bg-muted/40">
          {company.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <a
                href={`mailto:${company.email}`}
                className="min-w-0 break-all text-primary underline underline-offset-2 transition-colors hover:text-primary/80"
              >
                {company.email}
              </a>
            </div>
          )}

          {company.website && (
            <div className="flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <a
                href={websiteUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 truncate text-primary underline underline-offset-2 transition-colors hover:text-primary/80"
              >
                {t("popupWebsiteOpen")}
              </a>
            </div>
          )}

          {company.osm && (
            <div className="text-sm">
              <a
                href={getOpenStreetMapUrl(company.osm)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-w-0 items-center gap-1.5 text-primary underline underline-offset-2 transition-colors hover:text-primary/80"
              >
                <Globe className="h-4 w-4 shrink-0" aria-hidden />
                {t("popupOpenOsm")}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
        <Button
          size="sm"
          variant="default"
          className="min-h-9 flex-1"
          onClick={() => window.open(`/companies/${company.id}`, "_blank")}
          type="button"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          {t("popupOpenCompany")}
        </Button>

        {company.telefon && (
          <Button size="sm" variant="outline" className="min-h-9 border-border bg-background/80 dark:bg-background/50" asChild type="button">
            <a href={`tel:${company.telefon}`} title={t("popupCallTitle")}>
              <Phone className="h-4 w-4" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
