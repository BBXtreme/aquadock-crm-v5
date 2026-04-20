"use client";

import { Edit, Loader2, Locate, MapPin, Waves } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { GeocodeReviewModal } from "@/components/features/companies/GeocodeReviewModal";
import AquaDockEditForm from "@/components/features/companies/AquaDockEditForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyDash } from "@/components/ui/empty-dash";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  applyApprovedGeocodes,
  type GeocodeBatchPreviewRow,
  geocodeCompanyBatch,
} from "@/lib/actions/companies";
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
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeApplying, setGeocodeApplying] = useState(false);
  const [geocodeModalOpen, setGeocodeModalOpen] = useState(false);
  const [geocodePreviewRows, setGeocodePreviewRows] = useState<GeocodeBatchPreviewRow[]>([]);

  const hasCoordinates = company.lat != null && company.lon != null;

  // Mirror companyNeedsGeocode() on the list page: we can only geocode when
  // we have Stadt + (Strasse OR PLZ). Everything else is unreliable noise.
  const stadt = (company.stadt ?? "").trim();
  const strasse = (company.strasse ?? "").trim();
  const plz = (company.plz ?? "").trim();
  const canGeocode = stadt.length > 0 && (strasse.length > 0 || plz.length > 0);

  const handleGeocode = async () => {
    if (!canGeocode || geocodeLoading) return;
    setGeocodeLoading(true);
    try {
      const res = await geocodeCompanyBatch({
        items: [
          {
            rowId: `company-geocode-${company.id}`,
            companyId: company.id,
            firmenname: company.firmenname,
            strasse: company.strasse ?? null,
            plz: company.plz ?? null,
            stadt: company.stadt ?? null,
            land: company.land ?? null,
            currentLat: typeof company.lat === "number" ? company.lat : null,
            currentLon: typeof company.lon === "number" ? company.lon : null,
          },
        ],
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setGeocodePreviewRows(res.results);
      setGeocodeModalOpen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("geocodeDetailErrorGeneric");
      toast.error(message);
    } finally {
      setGeocodeLoading(false);
    }
  };

  const handleApplyGeocode = async (rowIds: string[]) => {
    const previewById = new Map<string, GeocodeBatchPreviewRow>();
    for (const row of geocodePreviewRows) {
      previewById.set(row.rowId, row);
    }
    const applyItems = rowIds
      .map((rowId) => previewById.get(rowId))
      .filter(
        (preview): preview is GeocodeBatchPreviewRow =>
          preview !== undefined &&
          preview.companyId !== null &&
          preview.suggestedLat !== null &&
          preview.suggestedLon !== null,
      )
      .map((preview) => ({
        companyId: preview.companyId as string,
        suggestedLat: preview.suggestedLat as number,
        suggestedLon: preview.suggestedLon as number,
      }));
    if (applyItems.length === 0) return;

    setGeocodeApplying(true);
    try {
      const applyRes = await applyApprovedGeocodes({ items: applyItems });
      if (!applyRes.ok) {
        toast.error(applyRes.error);
        return;
      }
      const failed = applyRes.results.filter((r) => !r.ok).length;
      if (failed > 0) {
        toast.error(t("geocodeDetailToastFailed"));
      } else {
        toast.success(t("geocodeDetailToastApplied"));
      }
      setGeocodeModalOpen(false);
      setGeocodePreviewRows([]);
      onCompanyUpdated?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : t("geocodeDetailErrorGeneric");
      toast.error(message);
    } finally {
      setGeocodeApplying(false);
    }
  };

  const geocodeButton = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => void handleGeocode()}
      disabled={!canGeocode || geocodeLoading || geocodeApplying}
      aria-label={
        hasCoordinates
          ? t("geocodeDetailRefreshLabel")
          : t("geocodeDetailFillLabel")
      }
      title={
        hasCoordinates
          ? t("geocodeDetailRefreshLabel")
          : t("geocodeDetailFillLabel")
      }
    >
      {geocodeLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Locate className="h-4 w-4" aria-hidden />
      )}
    </Button>
  );

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
            <div className="flex items-center gap-1">
              {canGeocode ? (
                geocodeButton
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-block">{geocodeButton}</span>
                  </TooltipTrigger>
                  <TooltipContent>{t("geocodeDetailIncompleteAddressTooltip")}</TooltipContent>
                </Tooltip>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditDialogOpen(true)}>
                <Edit className="h-4 w-4" />
              </Button>
            </div>
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

      <GeocodeReviewModal
        open={geocodeModalOpen}
        onOpenChange={(next) => {
          setGeocodeModalOpen(next);
          if (!next) {
            setGeocodePreviewRows([]);
          }
        }}
        rows={geocodePreviewRows}
        isApplying={geocodeApplying}
        onApplySelected={handleApplyGeocode}
      />

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
