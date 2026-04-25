"use client";

import { Loader2, Locate, Trash } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useT } from "@/lib/i18n/use-translations";

export function CompaniesTableBulkActions({
  rowSelection,
  selectedRowIds,
  geocodableSelectedCount,
  geocodeLoading,
  bulkDeleteDialogOpen,
  onBulkDeleteDialogOpenChange,
  onBulkGeocodePreview,
  onBulkDelete,
}: {
  rowSelection: Record<string, boolean>;
  selectedRowIds: string[];
  geocodableSelectedCount: number;
  geocodeLoading: boolean;
  bulkDeleteDialogOpen: boolean;
  onBulkDeleteDialogOpenChange: (open: boolean) => void;
  onBulkGeocodePreview: () => void;
  onBulkDelete: () => void;
}) {
  const t = useT("companies");
  const selectedCount = selectedRowIds.length;
  const hasGeocodable = geocodableSelectedCount > 0;
  const tooltipLabel = hasGeocodable
    ? t("geocodeBulkTooltipReady", {
        geocodable: geocodableSelectedCount,
        selected: selectedCount,
      })
    : t("geocodeBulkTooltipNone");

  const geocodeButton = (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      aria-label={tooltipLabel}
      disabled={geocodeLoading || !hasGeocodable}
      onClick={() => {
        onBulkGeocodePreview();
      }}
    >
      {geocodeLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Locate className="h-4 w-4" aria-hidden />}
    </Button>
  );

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{geocodeButton}</span>
        </TooltipTrigger>
        <TooltipContent>{tooltipLabel}</TooltipContent>
      </Tooltip>
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={onBulkDeleteDialogOpenChange}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" title={t("deleteSelectedTitle")}>
            <Trash className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("bulkDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("bulkDeleteDescription", { count: Object.keys(rowSelection).length })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onBulkDelete();
              }}
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
