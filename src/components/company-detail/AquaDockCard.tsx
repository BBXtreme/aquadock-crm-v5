"use client";

import { Edit, MapPin, Waves } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AquaDockEditForm from "@/components/features/companies/AquaDockEditForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyDash } from "@/components/ui/empty-dash";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useT } from "@/lib/i18n/use-translations";
import type { Database } from "@/types/database.types";

type Company = Database["public"]["Tables"]["companies"]["Row"];

interface Props {
  company: Company;
  onCompanyUpdated?: () => void;
}

export default function AquaDockCard({ company, onCompanyUpdated }: Props) {
  const t = useT("companies");
  const router = useRouter();
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const hasCoordinates = company.lat != null && company.lon != null;

  const formatOsmLink = () => {
    if (!company.osm) return <EmptyDash />;

    // OSM resolves the object from its path (e.g. /node/123) and centers
    // the viewport on it automatically. Only append `#map=zoom/lat/lon`
    // when we actually have coordinates — never fabricate a location.
    const base = `https://www.openstreetmap.org/${company.osm}`;
    const url = hasCoordinates ? `${base}#map=16/${company.lat}/${company.lon}` : base;

    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline font-medium break-all"
      >
        <MapPin className="w-4 h-4" />
        <span className="font-mono text-sm">{company.osm}</span>
      </a>
    );
  };

  const openMapButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="mt-3"
      aria-disabled={!hasCoordinates}
      onClick={() => {
        if (!hasCoordinates) return;
        router.push(`/openmap?lat=${company.lat}&lon=${company.lon}&zoom=13`);
      }}
      data-state={hasCoordinates ? "enabled" : "disabled"}
      // Keep the button focusable/hoverable when "disabled" so the tooltip
      // still activates. We use aria-disabled + a no-op click instead of
      // the native `disabled` attribute.
      tabIndex={0}
      style={hasCoordinates ? undefined : { opacity: 0.5, cursor: "not-allowed" }}
    >
      <MapPin className="h-4 w-4 mr-2" />
      {t("detailOpenMapButton")}
    </Button>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Waves className="w-5 h-5" />
              {t("detailSectionAquadock")}
            </CardTitle>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditDialogOpen(true)}>
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">{t("detailLabelWasserdistanz")}</div>
              <p className="text-sm text-foreground">
                {company.wasserdistanz != null
                  ? t("detailMeters", { meters: company.wasserdistanz })
                  : <EmptyDash />}
              </p>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">{t("detailLabelWassertyp")}</div>
              <p className="text-sm text-foreground">{company.wassertyp || <EmptyDash />}</p>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">{t("detailLabelLatitude")}</div>
              <p className="text-sm text-foreground font-mono">
                {company.lat != null ? company.lat.toString() : <EmptyDash />}
              </p>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">{t("detailLabelLongitude")}</div>
              <p className="text-sm text-foreground font-mono">
                {company.lon != null ? company.lon.toString() : <EmptyDash />}
              </p>
            </div>
            <div className="lg:col-span-2">
              <div>
                <div className="text-sm font-medium text-muted-foreground">{t("detailLabelOsmId")}</div>
                <p className="text-sm text-foreground">{formatOsmLink()}</p>

                {hasCoordinates ? (
                  openMapButton
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-block">{openMapButton}</span>
                    </TooltipTrigger>
                    <TooltipContent>{t("detailMissingCoordinatesTooltip")}</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("dialogEditAquadockTitle")}</DialogTitle>
          </DialogHeader>
          <AquaDockEditForm
            company={company}
            onSuccess={() => {
              onCompanyUpdated?.();
              setEditDialogOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
