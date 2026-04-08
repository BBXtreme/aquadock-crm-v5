// src/components/features/map/CompanyMarkerPopup.tsx
// This component renders a popup for company markers on the map, showing details and actions.

"use client";

import { Droplets, ExternalLink, Globe, Mail, MapPin, Phone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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

  const hasContactBlock = Boolean(company.email || company.website || company.osm);
  const hasDetailsSection = Boolean(fullAddress || waterLine !== null || hasContactBlock);

  const actionButtonClass =
    "flex h-auto min-h-10 w-full flex-row items-center justify-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-medium leading-snug [&_svg]:shrink-0";

  return (
    <div className="box-border w-full max-w-full min-w-[min(288px,100%)] space-y-5 p-0 text-sm text-card-foreground">
      <div className="pr-1">
        <div className="text-balance font-semibold text-base leading-snug tracking-tight text-foreground">{company.firmenname}</div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium text-white shadow-sm ring-1 ring-border/60 dark:ring-border"
          style={{ backgroundColor: statusColor }}
        >
          {statusLabel}
        </div>

        <div
          className="whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium text-white shadow-sm ring-1 ring-border/60 dark:ring-border"
          style={{ backgroundColor: kundentypColor }}
        >
          {getKundentypLabel(company.kundentyp?.toLowerCase() || "sonstige")}
        </div>

        {company.wassertyp && (
          <div
            className="flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium text-white shadow-sm ring-1 ring-border/60 dark:ring-border"
            style={{ backgroundColor: wassertypColor }}
          >
            <Droplets className="h-3.5 w-3.5 opacity-95" aria-hidden />
            {company.wassertyp}
          </div>
        )}

        {company.firmentyp && (
          <Badge
            variant="secondary"
            className="h-auto max-w-full min-w-0 justify-start whitespace-normal rounded-lg px-2.5 py-1 text-left text-xs leading-snug"
          >
            {getFirmentypLabel(company.firmentyp)}
          </Badge>
        )}
      </div>

      {hasDetailsSection && (
        <div className="space-y-2.5">
          {fullAddress && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 leading-relaxed">{fullAddress}</span>
            </div>
          )}

          {waterLine !== null && (
            <div className="flex items-start gap-2 text-sm font-medium text-foreground">
              <Droplets className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span className="min-w-0 leading-relaxed">{waterLine}</span>
            </div>
          )}

          {company.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <a
                href={`mailto:${company.email}`}
                className="min-w-0 break-all font-medium text-primary underline underline-offset-2 transition-colors hover:text-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
                className="min-w-0 truncate font-medium text-primary underline underline-offset-2 transition-colors hover:text-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {t("popupWebsiteOpen")}
              </a>
            </div>
          )}

          {company.osm && (
            <div className="flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <a
                href={getOpenStreetMapUrl(company.osm)}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 font-medium text-primary underline underline-offset-2 transition-colors hover:text-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {t("popupOpenOsm")}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-col gap-2.5 border-t border-border/80 pt-4">
        <Button
          size="default"
          variant="default"
          className={actionButtonClass}
          onClick={() => window.open(`/companies/${company.id}`, "_blank")}
          type="button"
        >
          <ExternalLink className="size-4" aria-hidden />
            <span className="min-w-0 max-w-full truncate text-center">{t("popupOpenCompany")}</span>
        </Button>

        {company.telefon && (
          <Button size="default" variant="outline" className={actionButtonClass} asChild type="button">
            <a href={`tel:${company.telefon}`}>
              <Phone className="size-4" aria-hidden />
              <span className="min-w-0 max-w-full truncate text-center">{t("popupCallTitle")}</span>
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
