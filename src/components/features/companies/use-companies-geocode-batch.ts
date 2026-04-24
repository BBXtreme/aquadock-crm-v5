"use client";

import type { QueryClient } from "@tanstack/react-query";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  companyNeedsGeocode,
  GEOCODE_BATCH_MAX,
} from "@/components/features/companies/client-companies-constants";
import {
  applyApprovedGeocodes,
  type GeocodeBatchPreviewRow,
  geocodeCompanyBatch,
} from "@/lib/actions/companies";
import type { Company } from "@/types/database.types";

export function useCompaniesGeocodeBatch(options: {
  rowSelection: Record<string, boolean>;
  companies: Company[];
  queryClient: QueryClient;
  setRowSelection: Dispatch<SetStateAction<Record<string, boolean>>>;
}) {
  const { rowSelection, companies, queryClient, setRowSelection } = options;
  const [geocodeModalOpen, setGeocodeModalOpen] = useState(false);
  const [geocodePreviewRows, setGeocodePreviewRows] = useState<GeocodeBatchPreviewRow[]>([]);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeApplying, setGeocodeApplying] = useState(false);

  const handleBulkGeocodePreview = useCallback(async () => {
    const selectedIds = Object.keys(rowSelection);
    if (selectedIds.length === 0) {
      return;
    }

    const items: {
      rowId: string;
      companyId: string;
      firmenname: string;
      strasse: string | null;
      plz: string | null;
      stadt: string | null;
      land: string | null;
      currentLat: number | null;
      currentLon: number | null;
    }[] = [];

    for (const id of selectedIds) {
      const company = companies.find((c) => c.id === id);
      if (company === undefined || !companyNeedsGeocode(company)) {
        continue;
      }
      items.push({
        rowId: `company-geocode-${company.id}`,
        companyId: company.id,
        firmenname: company.firmenname,
        strasse: company.strasse ?? null,
        plz: company.plz ?? null,
        stadt: company.stadt ?? null,
        land: company.land ?? null,
        currentLat: typeof company.lat === "number" ? company.lat : null,
        currentLon: typeof company.lon === "number" ? company.lon : null,
      });
    }

    if (items.length === 0) {
      toast.message("Keine ausgewählten Einträge für Geocoding.", {
        description: "Es fehlen gültige Adressdaten oder die Koordinaten sind bereits vollständig.",
      });
      return;
    }

    const trimmed = items.slice(0, GEOCODE_BATCH_MAX);
    if (items.length > GEOCODE_BATCH_MAX) {
      toast.message(`Es werden nur die ersten ${String(GEOCODE_BATCH_MAX)} Einträge geocodiert.`);
    }

    setGeocodeLoading(true);
    try {
      const res = await geocodeCompanyBatch({ items: trimmed });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setGeocodePreviewRows(res.results);
      setGeocodeModalOpen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Geocoding fehlgeschlagen.";
      toast.error(message);
    } finally {
      setGeocodeLoading(false);
    }
  }, [rowSelection, companies]);

  const handleApplyCompanyGeocodes = useCallback(
    async (rowIds: string[]) => {
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
          companyId: preview.companyId,
          suggestedLat: preview.suggestedLat,
          suggestedLon: preview.suggestedLon,
        }));

      if (applyItems.length === 0) {
        return;
      }

      setGeocodeApplying(true);
      try {
        const applyRes = await applyApprovedGeocodes({ items: applyItems });
        if (!applyRes.ok) {
          toast.error(applyRes.error);
          return;
        }

        const failed = applyRes.results.filter((r) => !r.ok).length;
        const ok = applyRes.results.length - failed;
        if (failed > 0) {
          toast.success(`${String(ok)} übernommen, ${String(failed)} fehlgeschlagen.`);
        } else {
          toast.success(`${String(ok)} Koordinaten übernommen.`);
        }

        await queryClient.invalidateQueries({ queryKey: ["companies"] });
        setRowSelection({});
        setGeocodeModalOpen(false);
        setGeocodePreviewRows([]);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Übernahme fehlgeschlagen.";
        toast.error(message);
      } finally {
        setGeocodeApplying(false);
      }
    },
    [geocodePreviewRows, queryClient, setRowSelection],
  );

  const geocodeModalProps = {
    open: geocodeModalOpen,
    onOpenChange: (next: boolean) => {
      setGeocodeModalOpen(next);
      if (!next) {
        setGeocodePreviewRows([]);
      }
    },
    rows: geocodePreviewRows,
    isApplying: geocodeApplying,
    onApplySelected: handleApplyCompanyGeocodes,
  };

  return {
    geocodeLoading,
    handleBulkGeocodePreview,
    geocodeModalProps,
  };
}
