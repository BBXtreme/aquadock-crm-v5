"use client";

import {
  type ColumnDef,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { FileSpreadsheet, Loader2, MapPin } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  CSVFieldGuide,
  csvImportFullscreenDialogContentClassName,
  csvImportFullscreenOverlayClassName,
} from "@/components/features/companies/CSVFieldGuide";
import { GeocodeReviewModal } from "@/components/features/companies/GeocodeReviewModal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  applyApprovedGeocodes,
  type GeocodeBatchPreviewRow,
  geocodeCompanyBatch,
} from "@/lib/actions/companies";
import { useT } from "@/lib/i18n/use-translations";
import type { ParsedCompanyRow } from "@/lib/utils/csv-import";

const PREVIEW_FIELD_KEYS: (keyof ParsedCompanyRow)[] = [
  "firmenname",
  "kundentyp",
  "wasser_distanz",
  "wassertyp",
  "strasse",
  "plz",
  "ort",
  "bundesland",
  "land",
  "telefon",
  "website",
  "email",
  "lat",
  "lon",
  "osm",
];

function cellString(value: string | number | undefined | null, dash: string): string {
  if (value === undefined || value === null || value === "") {
    return dash;
  }
  return String(value);
}

function getDetectedColumnKeys(rows: ParsedCompanyRow[]): string[] {
  const found = new Set<string>();
  for (const row of rows) {
    for (const key of PREVIEW_FIELD_KEYS) {
      const v = row[key];
      if (v !== undefined && v !== null && v !== "") {
        found.add(key);
      }
    }
  }
  return [...found];
}

type CoordinateQuality = "valid" | "partial" | "missing";

type CoordinateSummary = {
  validCount: number;
  partialCount: number;
  missingCount: number;
  missingWithAddressCount: number;
};

type CoordinateProblemRow = {
  rowId: string;
  rowNumber: number;
  firmenname: string;
  statusText: string;
  latText: string;
  lonText: string;
  hasAddress: boolean;
};

function hasAddressData(row: ParsedCompanyRow): boolean {
  return (
    (row.strasse?.trim() ?? "") !== "" ||
    (row.plz?.trim() ?? "") !== "" ||
    (row.ort?.trim() ?? "") !== "" ||
    (row.land?.trim() ?? "") !== ""
  );
}

function getCoordinateQuality(row: ParsedCompanyRow): CoordinateQuality {
  const hasLat = typeof row.lat === "number";
  const hasLon = typeof row.lon === "number";
  if (hasLat && hasLon) {
    return "valid";
  }
  if (hasLat || hasLon) {
    return "partial";
  }
  return "missing";
}

function hasStructuredAddressForGeocode(row: ParsedCompanyRow): boolean {
  const city = (row.ort ?? "").trim();
  const street = (row.strasse ?? "").trim();
  const plz = (row.plz ?? "").trim();
  return city.length > 0 && (street.length > 0 || plz.length > 0);
}

function rowQualifiesForGeocode(row: ParsedCompanyRow): boolean {
  if (!hasStructuredAddressForGeocode(row)) {
    return false;
  }
  return getCoordinateQuality(row) !== "valid";
}

function parseCsvPreviewRowIndex(rowId: string): number | undefined {
  const prefix = "csv-preview-row-";
  if (!rowId.startsWith(prefix)) {
    return undefined;
  }
  const rest = rowId.slice(prefix.length);
  const index = Number.parseInt(rest, 10);
  return Number.isFinite(index) ? index : undefined;
}

function toCoordinateText(value: number | undefined, dash: string): string {
  return typeof value === "number" ? value.toFixed(6) : dash;
}

const columnHelper = createColumnHelper<ParsedCompanyRow>();

export interface CSVPreviewViewProps {
  open: boolean;
  rows: ParsedCompanyRow[];
  fileName: string;
  isImporting: boolean;
  aiEnrichNewCompanies: boolean;
  onAiEnrichNewCompaniesChange: (value: boolean) => void;
  onImportRows: (rows: ParsedCompanyRow[]) => void | Promise<void>;
  onBackToEdit: () => void;
  onCancel: () => void;
}

export function CSVPreviewView({
  open,
  rows,
  fileName,
  isImporting,
  aiEnrichNewCompanies,
  onAiEnrichNewCompaniesChange,
  onImportRows,
  onBackToEdit,
  onCancel,
}: CSVPreviewViewProps) {
  const t = useT("csvImport");
  const tCommon = useT("common");
  const dash = tCommon("dash");

  const [displayRows, setDisplayRows] = useState<ParsedCompanyRow[]>(rows);
  const [geocodeModalOpen, setGeocodeModalOpen] = useState(false);
  const [geocodePreviewRows, setGeocodePreviewRows] = useState<GeocodeBatchPreviewRow[]>([]);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeApplying, setGeocodeApplying] = useState(false);

  useEffect(() => {
    setDisplayRows(rows);
  }, [rows]);

  const geocodeCandidateCount = useMemo(() => {
    let count = 0;
    for (const row of displayRows) {
      if (rowQualifiesForGeocode(row)) {
        count += 1;
      }
    }
    return count;
  }, [displayRows]);

  const handleOpenGeocodePreview = useCallback(async () => {
    const GEOCODE_BATCH_MAX = 50;
    const items: {
      rowId: string;
      firmenname: string;
      strasse: string | null;
      plz: string | null;
      stadt: string | null;
      land: string | null;
      currentLat: number | null;
      currentLon: number | null;
    }[] = [];

    for (const [index, row] of displayRows.entries()) {
      if (!rowQualifiesForGeocode(row)) {
        continue;
      }
      items.push({
        rowId: `csv-preview-row-${String(index)}`,
        firmenname: row.firmenname,
        strasse: row.strasse ?? null,
        plz: row.plz ?? null,
        stadt: row.ort ?? null,
        land: row.land ?? null,
        currentLat: typeof row.lat === "number" ? row.lat : null,
        currentLon: typeof row.lon === "number" ? row.lon : null,
      });
    }

    if (items.length === 0) {
      toast.message("Keine Zeilen mit ausreichender Adresse für Geocoding.", {
        description: "Bitte Straße oder PLZ sowie Ort ergänzen.",
      });
      return;
    }

    const trimmed = items.slice(0, GEOCODE_BATCH_MAX);
    if (items.length > GEOCODE_BATCH_MAX) {
      toast.message(`Es werden nur die ersten ${String(GEOCODE_BATCH_MAX)} Zeilen geocodiert.`);
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
  }, [displayRows]);

  const handleApplyGeocodeSelection = useCallback(
    async (rowIds: string[]) => {
      const previewById = new Map<string, GeocodeBatchPreviewRow>();
      for (const row of geocodePreviewRows) {
        previewById.set(row.rowId, row);
      }

      const applyItems = rowIds
        .map((rowId) => {
          const preview = previewById.get(rowId);
          if (
            preview === undefined ||
            preview.suggestedLat === null ||
            preview.suggestedLon === null
          ) {
            return null;
          }
          return {
            rowId,
            suggestedLat: preview.suggestedLat,
            suggestedLon: preview.suggestedLon,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

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

        setDisplayRows((prev) => {
          const next = [...prev];
          for (const item of applyRes.results) {
            if (!item.ok || item.rowId === undefined) {
              continue;
            }
            const idx = parseCsvPreviewRowIndex(item.rowId);
            if (idx === undefined || idx < 0 || idx >= next.length) {
              continue;
            }
            const current = next[idx];
            if (current === undefined) {
              continue;
            }
            next[idx] = { ...current, lat: item.lat, lon: item.lon };
          }
          return next;
        });

        toast.success(`${String(applyItems.length)} Koordinaten übernommen.`);
        setGeocodeModalOpen(false);
        setGeocodePreviewRows([]);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Übernahme fehlgeschlagen.";
        toast.error(message);
      } finally {
        setGeocodeApplying(false);
      }
    },
    [geocodePreviewRows],
  );

  const coordinateSummary = useMemo<CoordinateSummary>(() => {
    let validCount = 0;
    let partialCount = 0;
    let missingCount = 0;
    let missingWithAddressCount = 0;

    for (const row of displayRows) {
      const quality = getCoordinateQuality(row);
      if (quality === "valid") {
        validCount += 1;
        continue;
      }
      if (quality === "partial") {
        partialCount += 1;
        continue;
      }
      missingCount += 1;
      if (hasAddressData(row)) {
        missingWithAddressCount += 1;
      }
    }

    return {
      validCount,
      partialCount,
      missingCount,
      missingWithAddressCount,
    };
  }, [displayRows]);

  const problemRows = useMemo<CoordinateProblemRow[]>(() => {
    const problems: CoordinateProblemRow[] = [];

    for (const [index, row] of displayRows.entries()) {
      const quality = getCoordinateQuality(row);
      if (quality === "valid") {
        continue;
      }

      const statusText = quality === "partial" ? "Unvollständige Koordinaten" : "Keine Koordinaten";
      problems.push({
        rowId: `coord-problem-${String(index)}`,
        rowNumber: index + 1,
        firmenname: row.firmenname,
        statusText,
        latText: toCoordinateText(row.lat, dash),
        lonText: toCoordinateText(row.lon, dash),
        hasAddress: hasAddressData(row),
      });
    }

    return problems;
  }, [displayRows, dash]);

  const exportProblemRows = useMemo(() => {
    return () => {
      if (problemRows.length === 0) {
        return;
      }
      const lines = [
        "row_number;firmenname;status;lat;lon;address_available",
        ...problemRows.map((row) =>
          [
            String(row.rowNumber),
            row.firmenname.replaceAll(";", ","),
            row.statusText.replaceAll(";", ","),
            row.latText,
            row.lonText,
            row.hasAddress ? "yes" : "no",
          ].join(";"),
        ),
      ];
      const csvContent = `${lines.join("\n")}\n`;
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "csv-coordinate-problems.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };
  }, [problemRows]);

  const columns = useMemo(
    () =>
      PREVIEW_FIELD_KEYS.map((key) =>
        columnHelper.accessor(key, {
          id: key,
          header: t(`cols.${key}`),
          cell: (info) => {
            const value = info.getValue();
            if (key === "lat" || key === "lon") {
              const n = value as number | undefined;
              const quality = getCoordinateQuality(info.row.original);
              const qualityClassName =
                quality === "valid"
                  ? "bg-emerald-500"
                  : quality === "partial"
                    ? "bg-red-500"
                    : "bg-amber-500";
              const qualityLabel =
                quality === "valid"
                  ? "Koordinaten gültig"
                  : quality === "partial"
                    ? "Koordinaten unvollständig"
                    : "Keine Koordinaten";
              return (
                <span className="inline-flex items-center gap-2 whitespace-nowrap">
                  <span
                    className={`h-2 w-2 rounded-full ${qualityClassName}`}
                    title={qualityLabel}
                  />
                  <span>{n !== undefined ? n.toFixed(4) : dash}</span>
                </span>
              );
            }
            return <span className="whitespace-nowrap">{cellString(value as string | number | undefined, dash)}</span>;
          },
        }),
      ) as ColumnDef<ParsedCompanyRow>[],
    [t, dash],
  );
  const detectedKeys = useMemo(() => getDetectedColumnKeys(displayRows), [displayRows]);

  const table = useReactTable({
    data: displayRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (_row, index) => `csv-preview-row-${String(index)}`,
  });

  const fieldsSummary =
    detectedKeys.length > 0 ? detectedKeys.join(", ") : t("previewMetaNoFields");

  return (
    <>
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
        onApplySelected={handleApplyGeocodeSelection}
      />
      <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onCancel();
        }
      }}
    >
      <DialogContent
        showCloseButton={true}
        overlayClassName={csvImportFullscreenOverlayClassName}
        className={csvImportFullscreenDialogContentClassName}
      >
        <div className="flex h-full min-h-0 flex-col bg-background">
          <DialogHeader className="shrink-0 space-y-1 border-b border-border px-6 py-4 text-left">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground" aria-hidden />
              <DialogTitle className="text-lg">{t("previewTitle")}</DialogTitle>
            </div>
            <DialogDescription className="text-muted-foreground text-sm">
              {t("previewMeta", { fileName, count: displayRows.length, fields: fieldsSummary })}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="preview" className="flex min-h-0 flex-1 flex-col gap-0">
            <div className="shrink-0 border-b border-border px-6 py-2">
              <TabsList variant="line" className="w-full justify-start sm:w-auto">
                <TabsTrigger value="preview" className="px-3">
                  {t("previewTabPreview")}
                </TabsTrigger>
                <TabsTrigger value="problems" className="px-3">
                  Koordinaten-Probleme
                </TabsTrigger>
                <TabsTrigger value="guide" className="px-3">
                  {t("previewTabGuide")}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="preview" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden focus-visible:outline-none">
              <div className="min-h-0 flex-1 overflow-auto px-4 py-3 sm:px-6">
                <div className="mb-3 grid gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs sm:grid-cols-2 sm:text-sm lg:grid-cols-4">
                  <p>
                    <span className="font-medium">Gültig:</span> {coordinateSummary.validCount}
                  </p>
                  <p>
                    <span className="font-medium">Unvollständig:</span> {coordinateSummary.partialCount}
                  </p>
                  <p>
                    <span className="font-medium">Ohne Koordinaten:</span> {coordinateSummary.missingCount}
                  </p>
                  <p>
                    <span className="font-medium">Adress-basiert fixbar:</span> {coordinateSummary.missingWithAddressCount}
                  </p>
                </div>
                <div className="rounded-lg border border-border">
                  <Table className="w-max min-w-full text-sm">
                    <TableHeader>
                      {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <TableHead
                              key={header.id}
                              className="sticky top-0 z-10 whitespace-nowrap bg-muted/95 backdrop-blur-sm"
                            >
                              {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                            </TableHead>
                          ))}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id} className="align-top">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="problems" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden focus-visible:outline-none">
              <div className="min-h-0 flex-1 overflow-auto px-4 py-3 sm:px-6">
                <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs sm:text-sm">
                    {problemRows.length} Problemzeilen erkannt. Export enthält nur Zeilen ohne vollständige Koordinaten.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={exportProblemRows}
                    disabled={problemRows.length === 0}
                  >
                    CSV exportieren
                  </Button>
                </div>
                <div className="rounded-lg border border-border">
                  <Table className="w-max min-w-full text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Zeile</TableHead>
                        <TableHead>Firmenname</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Lat</TableHead>
                        <TableHead>Lon</TableHead>
                        <TableHead>Adresse vorhanden</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {problemRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-muted-foreground">
                            Keine Koordinaten-Probleme erkannt.
                          </TableCell>
                        </TableRow>
                      ) : (
                        problemRows.map((row) => (
                          <TableRow key={row.rowId}>
                            <TableCell>{row.rowNumber}</TableCell>
                            <TableCell>{row.firmenname}</TableCell>
                            <TableCell>{row.statusText}</TableCell>
                            <TableCell>{row.latText}</TableCell>
                            <TableCell>{row.lonText}</TableCell>
                            <TableCell>{row.hasAddress ? "Ja" : "Nein"}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="guide" className="mt-0 flex min-h-0 flex-1 overflow-auto px-4 py-3 sm:px-6 focus-visible:outline-none">
              <CSVFieldGuide spacious />
            </TabsContent>
          </Tabs>

          <div className="flex shrink-0 flex-col gap-3 border-t border-border bg-muted/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex flex-col gap-2">
              <p className="text-muted-foreground text-xs sm:text-sm">{t("previewFooter", { count: displayRows.length })}</p>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="csv-ai-enrich-new"
                  checked={aiEnrichNewCompanies}
                  onCheckedChange={(checked) => onAiEnrichNewCompaniesChange(checked === true)}
                  disabled={isImporting}
                  aria-label={t("previewAiEnrichLabel")}
                />
                <Label htmlFor="csv-ai-enrich-new" className="cursor-pointer text-muted-foreground text-xs leading-snug sm:text-sm">
                  {t("previewAiEnrichLabel")}
                </Label>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isImporting}>
                {t("previewCancel")}
              </Button>
              <Button type="button" variant="secondary" onClick={onBackToEdit} disabled={isImporting}>
                {t("previewBack")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleOpenGeocodePreview()}
                disabled={isImporting || geocodeLoading || displayRows.length === 0 || geocodeCandidateCount === 0}
                title={
                  geocodeCandidateCount === 0
                    ? "Keine Zeilen mit Adresse und fehlenden Koordinaten"
                    : "Koordinaten per Nominatim vorschlagen"
                }
              >
                {geocodeLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Geocoding…
                  </>
                ) : (
                  <>
                    <MapPin className="mr-2 h-4 w-4" aria-hidden />
                    Koordinaten vervollständigen
                  </>
                )}
              </Button>
              <Button
                type="button"
                onClick={() => void onImportRows(displayRows)}
                disabled={isImporting || displayRows.length === 0}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    {t("previewImporting")}
                  </>
                ) : (
                  t("previewImport", { count: displayRows.length })
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
