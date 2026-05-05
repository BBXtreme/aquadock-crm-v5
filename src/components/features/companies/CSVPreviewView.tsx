"use client";

import {
  type ColumnDef,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  type RowSelectionState,
  type Table as TanstackTable,
  useReactTable,
} from "@tanstack/react-table";
import { FileSpreadsheet, Loader2, MapPin, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  CSVFieldGuide,
  csvImportFullscreenDialogContentClassName,
  csvImportFullscreenOverlayClassName,
  csvImportStickyTableHeadClassName,
  csvImportTabPanelClassName,
  csvImportTabPanelScrollClassName,
} from "@/components/features/companies/CSVFieldGuide";
import { CsvImportAiEnrichmentReviewModal } from "@/components/features/companies/CsvImportAiEnrichmentReviewModal";
import { CsvImportDuplicateReviewPanel } from "@/components/features/companies/CsvImportDuplicateReviewPanel";
import { GeocodeReviewModal } from "@/components/features/companies/GeocodeReviewModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  applyApprovedGeocodes,
  type GeocodeBatchPreviewRow,
  geocodeCompanyBatch,
  previewCsvImportDuplicates,
} from "@/lib/actions/companies";
import {
  type CsvImportAiPreviewRowResult,
  previewCsvImportAiEnrichment,
} from "@/lib/actions/company-enrichment";
import { countEffectiveAiMergeFields, mergeAiEnrichmentIntoParsedRow } from "@/lib/companies/csv-import-ai-merge";
import {
  type CsvImportDuplicateRowAnalysis,
  countImportableRowsWithForce,
  rowIsImportableWithForce,
  rowNeedsDuplicateReview,
} from "@/lib/companies/csv-import-dedupe";
import { normalizeLandInput } from "@/lib/countries/iso-land";
import { useT } from "@/lib/i18n/use-translations";
import { cn } from "@/lib/utils";
import type { ParsedCompanyRow } from "@/lib/utils/csv-import";
import {
  CSV_IMPORT_AI_PREVIEW_MAX_ROWS,
  parsedCompanyRowsAiPreviewSchema,
  parsedCompanyRowsSchema,
} from "@/lib/validations/csv-import";

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

function getCsvPreviewLandStatus(row: ParsedCompanyRow): "empty" | "valid" | "invalid" {
  const raw = row.land?.trim() ?? "";
  if (raw === "") {
    return "empty";
  }
  const normalized = normalizeLandInput(raw);
  return normalized.ok ? "valid" : "invalid";
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

function CsvImportDataTable({ table }: { table: TanstackTable<ParsedCompanyRow> }) {
  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-card">
      <Table className="w-max min-w-full text-sm">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn("whitespace-nowrap", csvImportStickyTableHeadClassName)}
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
  );
}

export interface CSVPreviewViewProps {
  open: boolean;
  rows: ParsedCompanyRow[];
  fileName: string;
  isImporting: boolean;
  onImportRows: (
    rows: ParsedCompanyRow[],
    options?: { forceImportRowIndices?: number[]; excludeImportRowIndices?: number[] },
  ) => void | Promise<void>;
  onBackToEdit: () => void;
  onCancel: () => void;
}

export function CSVPreviewView({
  open,
  rows,
  fileName,
  isImporting,
  onImportRows,
  onBackToEdit,
  onCancel,
}: CSVPreviewViewProps) {
  const t = useT("csvImport");
  const tCompanies = useT("companies");
  const tCommon = useT("common");
  const dash = tCommon("dash");

  const [displayRows, setDisplayRows] = useState<ParsedCompanyRow[]>(rows);
  const [geocodeModalOpen, setGeocodeModalOpen] = useState(false);
  const [geocodePreviewRows, setGeocodePreviewRows] = useState<GeocodeBatchPreviewRow[]>([]);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeApplying, setGeocodeApplying] = useState(false);

  const [aiEnrichModalOpen, setAiEnrichModalOpen] = useState(false);
  const [aiPreviewResults, setAiPreviewResults] = useState<CsvImportAiPreviewRowResult[] | null>(null);
  const [aiEnrichLoading, setAiEnrichLoading] = useState(false);
  const [aiEnrichApplying, setAiEnrichApplying] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  /** true = user excludes this row from import (only meaningful when row is importable). */
  const [importExcludedByIndex, setImportExcludedByIndex] = useState<Record<number, boolean>>({});

  const [duplicateAnalyses, setDuplicateAnalyses] = useState<CsvImportDuplicateRowAnalysis[] | null>(null);
  const [duplicatePreviewLoading, setDuplicatePreviewLoading] = useState(false);
  const [duplicatePreviewError, setDuplicatePreviewError] = useState<string | null>(null);
  const [forceImportByIndex, setForceImportByIndex] = useState<Record<number, boolean>>({});
  const duplicateFetchGenerationRef = useRef(0);

  const busy =
    isImporting ||
    duplicatePreviewLoading ||
    geocodeLoading ||
    geocodeApplying ||
    aiEnrichLoading ||
    aiEnrichApplying;

  const mapAiPreviewBulkError = useCallback(
    (code: string) => {
      if (code === "NOT_AUTHENTICATED") {
        return tCompanies("aiEnrich.errorNotAuthenticated");
      }
      if (code === "AI_ENRICHMENT_DISABLED") {
        return tCompanies("aiEnrich.errorDisabled");
      }
      if (code === "AI_ENRICHMENT_RATE_LIMIT") {
        return tCompanies("aiEnrich.errorRateLimit");
      }
      if (code === "AI_GATEWAY_MISSING") {
        return tCompanies("aiEnrich.errorNoGateway");
      }
      if (code === "INVALID_INPUT") {
        return tCompanies("aiEnrich.errorGeneric");
      }
      return tCompanies("aiEnrich.errorGeneric");
    },
    [tCompanies],
  );

  const mapAiPreviewRowError = useCallback(
    (code: string) => {
      if (code === "ENRICHMENT_ABORTED") {
        return tCompanies("aiEnrich.errorGeneric");
      }
      return mapAiPreviewBulkError(code);
    },
    [mapAiPreviewBulkError, tCompanies],
  );

  const aiEnrichReviewRows = useMemo(() => {
    if (aiPreviewResults === null) {
      return [];
    }
    return aiPreviewResults.map((r) => {
      const row = displayRows[r.rowIndex];
      const rowId = `csv-preview-row-${String(r.rowIndex)}`;
      if (row === undefined) {
        return {
          rowId,
          rowIndex: r.rowIndex,
          firmenname: "—",
          ok: false as const,
          errorMessage: t("aiEnrichReviewRowMissing"),
          mergeFieldCount: 0,
        };
      }
      if (r.ok) {
        const mergeFieldCount = countEffectiveAiMergeFields(row, r.data);
        return {
          rowId,
          rowIndex: r.rowIndex,
          firmenname: row.firmenname,
          ok: true as const,
          mergeFieldCount,
          modelUsed: r.modelUsed,
        };
      }
      return {
        rowId,
        rowIndex: r.rowIndex,
        firmenname: row.firmenname,
        ok: false as const,
        errorMessage: mapAiPreviewRowError(r.error),
        mergeFieldCount: 0,
      };
    });
  }, [aiPreviewResults, displayRows, mapAiPreviewRowError, t]);

  useEffect(() => {
    setDisplayRows(rows);
    setRowSelection({});
    setImportExcludedByIndex({});
  }, [rows]);

  useEffect(() => {
    if (!open) {
      setAiEnrichModalOpen(false);
      setAiPreviewResults(null);
      setAiEnrichLoading(false);
      setAiEnrichApplying(false);
      setRowSelection({});
      setImportExcludedByIndex({});
    }
  }, [open]);

  const selectedRowCount = useMemo(() => {
    return Object.keys(rowSelection).filter((id) => rowSelection[id] === true).length;
  }, [rowSelection]);

  const fetchDuplicateAnalyses = useCallback(async () => {
    const generation = ++duplicateFetchGenerationRef.current;

    if (!open) {
      setDuplicateAnalyses(null);
      setDuplicatePreviewError(null);
      setDuplicatePreviewLoading(false);
      setForceImportByIndex({});
      return;
    }
    if (displayRows.length === 0) {
      setDuplicateAnalyses(null);
      setDuplicatePreviewError(null);
      setDuplicatePreviewLoading(false);
      setForceImportByIndex({});
      return;
    }

    setDuplicatePreviewLoading(true);
    setDuplicatePreviewError(null);
    const validated = parsedCompanyRowsSchema.safeParse(displayRows);
    if (!validated.success) {
      if (generation !== duplicateFetchGenerationRef.current) {
        return;
      }
      setDuplicatePreviewError(validated.error.issues.map((i) => i.message).join("; "));
      setDuplicatePreviewLoading(false);
      setDuplicateAnalyses(null);
      return;
    }
    const res = await previewCsvImportDuplicates(validated.data);
    if (generation !== duplicateFetchGenerationRef.current) {
      return;
    }
    setDuplicatePreviewLoading(false);
    if (!res.ok) {
      setDuplicatePreviewError(res.error);
      setDuplicateAnalyses(null);
      return;
    }
    setDuplicateAnalyses(res.analyses);
    setForceImportByIndex({});
  }, [open, displayRows]);

  useEffect(() => {
    void fetchDuplicateAnalyses();
  }, [fetchDuplicateAnalyses]);

  const retryDuplicatePreview = useCallback(() => {
    void fetchDuplicateAnalyses();
  }, [fetchDuplicateAnalyses]);

  const duplicateRowIndices = useMemo(() => {
    if (duplicateAnalyses === null) {
      return new Set<number>();
    }
    return new Set(duplicateAnalyses.filter(rowNeedsDuplicateReview).map((a) => a.rowIndex));
  }, [duplicateAnalyses]);

  const duplicateReviewCount = useMemo(() => {
    if (duplicateAnalyses === null) {
      return 0;
    }
    return duplicateAnalyses.filter(rowNeedsDuplicateReview).length;
  }, [duplicateAnalyses]);

  const forceSet = useMemo(() => {
    const s = new Set<number>();
    for (const [key, value] of Object.entries(forceImportByIndex)) {
      if (value === true) {
        s.add(Number(key));
      }
    }
    return s;
  }, [forceImportByIndex]);

  const importExcludeSet = useMemo(() => {
    const s = new Set<number>();
    for (const [key, value] of Object.entries(importExcludedByIndex)) {
      if (value === true) {
        s.add(Number(key));
      }
    }
    return s;
  }, [importExcludedByIndex]);

  const importableCount =
    duplicateAnalyses !== null
      ? countImportableRowsWithForce(duplicateAnalyses, forceSet, importExcludeSet)
      : 0;

  const importReady =
    duplicateAnalyses !== null && duplicatePreviewError === null && displayRows.length > 0;

  /** Rows skipped only because of duplicate rules (no force). */
  const duplicateSkippedCount = useMemo(() => {
    if (duplicateAnalyses === null) {
      return 0;
    }
    let n = 0;
    for (const a of duplicateAnalyses) {
      if (rowNeedsDuplicateReview(a) && !forceSet.has(a.rowIndex)) {
        n += 1;
      }
    }
    return n;
  }, [duplicateAnalyses, forceSet]);

  /** Eligible rows the user turned off in the Import column. */
  const userExcludedEligibleCount = useMemo(() => {
    if (duplicateAnalyses === null) {
      return 0;
    }
    let n = 0;
    for (const a of duplicateAnalyses) {
      if (!importExcludeSet.has(a.rowIndex)) {
        continue;
      }
      if (rowIsImportableWithForce(a, forceSet)) {
        n += 1;
      }
    }
    return n;
  }, [duplicateAnalyses, importExcludeSet, forceSet]);

  const duplicateImportAllForced =
    importReady &&
    duplicateReviewCount > 0 &&
    duplicateSkippedCount === 0 &&
    userExcludedEligibleCount === 0 &&
    importableCount === displayRows.length;

  const toggleImportIncludeForRow = useCallback((rowIndex: number, include: boolean) => {
    setImportExcludedByIndex((prev) => {
      const next = { ...prev };
      if (include) {
        delete next[rowIndex];
      } else {
        next[rowIndex] = true;
      }
      return next;
    });
  }, []);

  const toggleAllImportInclude = useCallback(
    (include: boolean) => {
      if (duplicateAnalyses === null) {
        return;
      }
      setImportExcludedByIndex((prev) => {
        const next = { ...prev };
        for (const a of duplicateAnalyses) {
          if (rowIsImportableWithForce(a, forceSet)) {
            if (include) {
              delete next[a.rowIndex];
            } else {
              next[a.rowIndex] = true;
            }
          }
        }
        return next;
      });
    },
    [duplicateAnalyses, forceSet],
  );

  const toggleDuplicateForce = useCallback((rowIndex: number, checked: boolean) => {
    setForceImportByIndex((prev) => ({ ...prev, [rowIndex]: checked }));
  }, []);

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
      toast.message(t("coordGeocodeToastNoRowsTitle"), {
        description: t("coordGeocodeToastNoRowsDescription"),
      });
      return;
    }

    const trimmed = items.slice(0, GEOCODE_BATCH_MAX);
    if (items.length > GEOCODE_BATCH_MAX) {
      toast.message(t("coordGeocodeToastTruncated", { max: String(GEOCODE_BATCH_MAX) }));
    }

    setGeocodeLoading(true);
    try {
      const res = await geocodeCompanyBatch({ items: trimmed });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const geocodeHits = res.results.filter((row) => row.ok).length;
      const geocodeMisses = res.results.length - geocodeHits;
      toast.success(t("coordGeocodeToastDoneTitle"), {
        description: t("coordGeocodeToastDoneDescription", {
          hits: String(geocodeHits),
          misses: String(geocodeMisses),
        }),
      });
      setGeocodePreviewRows(res.results);
      setGeocodeModalOpen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("coordGeocodeToastFailedFallback");
      toast.error(message);
    } finally {
      setGeocodeLoading(false);
    }
  }, [displayRows, t]);

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

        const appliedOk = applyRes.results.filter((item) => item.ok === true && item.rowId !== undefined).length;
        toast.success(t("coordGeocodeApplySuccessTitle", { count: String(appliedOk) }), {
          description: t("coordGeocodeApplySuccessDescription", { selected: String(applyItems.length) }),
        });
        setGeocodeModalOpen(false);
        setGeocodePreviewRows([]);
      } catch (error) {
        const message = error instanceof Error ? error.message : t("coordGeocodeApplyFailedFallback");
        toast.error(message);
      } finally {
        setGeocodeApplying(false);
      }
    },
    [geocodePreviewRows, t],
  );

  const handleRunAiEnrichmentPreview = useCallback(async () => {
    if (displayRows.length === 0) {
      return;
    }

    const selectedIndices: number[] = [];
    for (const rowId of Object.keys(rowSelection)) {
      if (rowSelection[rowId] !== true) {
        continue;
      }
      const idx = parseCsvPreviewRowIndex(rowId);
      if (idx !== undefined) {
        selectedIndices.push(idx);
      }
    }
    selectedIndices.sort((a, b) => a - b);

    if (selectedIndices.length === 0) {
      toast.message(t("aiEnrichSelectRowsFirst"));
      return;
    }

    let displayIndices = selectedIndices;
    if (selectedIndices.length > CSV_IMPORT_AI_PREVIEW_MAX_ROWS) {
      displayIndices = selectedIndices.slice(0, CSV_IMPORT_AI_PREVIEW_MAX_ROWS);
      toast.message(
        t("aiEnrichBatchTruncated", { max: String(CSV_IMPORT_AI_PREVIEW_MAX_ROWS) }),
      );
    }

    const batch = displayIndices.map((i) => displayRows[i]).filter((row): row is ParsedCompanyRow => row !== undefined);
    if (batch.length !== displayIndices.length) {
      toast.error(t("toastValidateErrorTitle"), { description: t("aiEnrichReviewRowMissing") });
      return;
    }

    const validated = parsedCompanyRowsAiPreviewSchema.safeParse(batch);
    if (!validated.success) {
      toast.error(t("toastValidateErrorTitle"), {
        description: validated.error.issues.map((i) => i.message).join("; "),
      });
      return;
    }

    setAiEnrichLoading(true);
    setAiPreviewResults(null);
    try {
      const res = await previewCsvImportAiEnrichment(validated.data);
      if (!res.ok) {
        toast.error(mapAiPreviewBulkError(res.error));
        return;
      }
      const remapped: CsvImportAiPreviewRowResult[] = res.results.map((r) => ({
        ...r,
        rowIndex: displayIndices[r.rowIndex] ?? r.rowIndex,
      }));
      const ok = remapped.filter((x) => x.ok).length;
      const fail = remapped.length - ok;
      toast.success(t("aiEnrichToastDone", { ok: String(ok), total: String(remapped.length), fail: String(fail) }));
      setAiPreviewResults(remapped);
      setAiEnrichModalOpen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : tCompanies("aiEnrich.errorGeneric");
      toast.error(message);
    } finally {
      setAiEnrichLoading(false);
    }
  }, [
    displayRows,
    mapAiPreviewBulkError,
    rowSelection,
    t,
    tCompanies,
  ]);

  const handleApplyAiEnrichmentSelection = useCallback(
    async (rowIndices: number[]) => {
      if (aiPreviewResults === null || rowIndices.length === 0) {
        return;
      }

      setAiEnrichApplying(true);
      try {
        const byIndex = new Map(aiPreviewResults.map((r) => [r.rowIndex, r]));
        setDisplayRows((prev) => {
          const next = [...prev];
          for (const idx of rowIndices) {
            const r = byIndex.get(idx);
            const cur = next[idx];
            if (r?.ok !== true || cur === undefined) {
              continue;
            }
            next[idx] = mergeAiEnrichmentIntoParsedRow(cur, r.data);
          }
          return next;
        });

        toast.success(t("aiEnrichToastApplied", { count: String(rowIndices.length) }));
        setAiEnrichModalOpen(false);
        setAiPreviewResults(null);
      } finally {
        setAiEnrichApplying(false);
      }
    },
    [aiPreviewResults, t],
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

      const statusText = quality === "partial" ? t("coordSummaryPartial") : t("coordSummaryMissing");
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
  }, [displayRows, dash, t]);

  const importIncludeColumn = useMemo(() => {
    const eligible =
      importReady && duplicateAnalyses !== null
        ? duplicateAnalyses.filter((a) => rowIsImportableWithForce(a, forceSet))
        : [];
    const allIncluded =
      eligible.length > 0 && eligible.every((a) => importExcludedByIndex[a.rowIndex] !== true);
    const someIncluded = eligible.some((a) => importExcludedByIndex[a.rowIndex] !== true);

    return columnHelper.display({
      id: "importInclude",
      header: () => (
        <div className="flex flex-col items-center gap-1.5 py-0.5">
          <span className="whitespace-nowrap font-medium text-muted-foreground text-xs uppercase leading-none tracking-wide">
            {t("previewColImport")}
          </span>
          <Checkbox
            checked={eligible.length === 0 ? false : allIncluded ? true : someIncluded ? "indeterminate" : false}
            disabled={!importReady || eligible.length === 0}
            onCheckedChange={(value) => {
              toggleAllImportInclude(value === true);
            }}
            aria-label={t("previewImportIncludeAllAria")}
          />
        </div>
      ),
      cell: ({ row }) => {
        const idx = row.index;
        const analysis = duplicateAnalyses?.[idx];
        if (analysis === undefined) {
          return <span className="text-muted-foreground text-xs">{dash}</span>;
        }
        const eligibleRow = rowIsImportableWithForce(analysis, forceSet);
        const excluded = importExcludedByIndex[idx] === true;
        const checked = eligibleRow && !excluded;
        return (
          <Checkbox
            checked={checked}
            disabled={!importReady || !eligibleRow}
            title={!eligibleRow ? t("previewImportRowDisabledHint") : undefined}
            onCheckedChange={(value) => {
              if (eligibleRow) {
                toggleImportIncludeForRow(idx, value === true);
              }
            }}
            aria-label={t("previewImportIncludeRowAria", { row: String(idx + 1) })}
          />
        );
      },
    });
  }, [
    duplicateAnalyses,
    forceSet,
    importExcludedByIndex,
    importReady,
    t,
    dash,
    toggleAllImportInclude,
    toggleImportIncludeForRow,
  ]);

  const selectionColumn = useMemo(
    () =>
      columnHelper.display({
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected()
                ? true
                : table.getIsSomePageRowsSelected()
                  ? "indeterminate"
                  : false
            }
            onCheckedChange={(value) => {
              table.toggleAllPageRowsSelected(value === true);
            }}
            disabled={displayRows.length === 0}
            aria-label={t("aiEnrichSelectAllAria")}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onCheckedChange={(value) => {
              row.toggleSelected(value === true);
            }}
            aria-label={t("aiEnrichSelectRowAria", { row: String(row.index + 1) })}
          />
        ),
      }),
    [displayRows.length, t],
  );

  const dataColumns = useMemo(
    () =>
      PREVIEW_FIELD_KEYS.map((key) =>
        columnHelper.accessor(key, {
          id: key,
          header: t(`cols.${key}`),
          cell: (info) => {
            const value = info.getValue();
            if (key === "firmenname") {
              const idx = info.row.index;
              const showDup = duplicateRowIndices.has(idx);
              return (
                <span className="inline-flex items-center gap-2 whitespace-nowrap">
                  {showDup ? (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full bg-amber-500"
                      title={t("duplicateRowMarkerTitle")}
                      aria-hidden
                    />
                  ) : null}
                  <span>{cellString(value as string | number | undefined, dash)}</span>
                </span>
              );
            }
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
                  ? t("coordSummaryValid")
                  : quality === "partial"
                    ? t("coordSummaryPartial")
                    : t("coordSummaryMissing");
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
            if (key === "land") {
              const status = getCsvPreviewLandStatus(info.row.original);
              const displayText = cellString(value as string | number | undefined, dash);
              const badgeVariant =
                status === "valid" ? "secondary" : status === "invalid" ? "destructive" : "outline";
              const badgeLabel =
                status === "valid" ? t("landBadgeValid") : status === "invalid" ? t("landBadgeInvalid") : t("landBadgeEmpty");
              return (
                <span className="inline-flex items-center gap-2 whitespace-nowrap">
                  <Badge variant={badgeVariant} className="shrink-0 text-[10px] uppercase tracking-wide">
                    {badgeLabel}
                  </Badge>
                  <span>{displayText}</span>
                </span>
              );
            }
            return <span className="whitespace-nowrap">{cellString(value as string | number | undefined, dash)}</span>;
          },
        }),
      ) as ColumnDef<ParsedCompanyRow>[],
    [t, dash, duplicateRowIndices],
  );

  const previewColumns = useMemo(
    () => [importIncludeColumn, ...dataColumns] as ColumnDef<ParsedCompanyRow>[],
    [dataColumns, importIncludeColumn],
  );
  const aiEnrichColumns = useMemo(
    () => [selectionColumn, ...dataColumns] as ColumnDef<ParsedCompanyRow>[],
    [dataColumns, selectionColumn],
  );
  const detectedKeys = useMemo(() => getDetectedColumnKeys(displayRows), [displayRows]);

  const previewTable = useReactTable({
    data: displayRows,
    columns: previewColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (_row, index) => `csv-preview-row-${String(index)}`,
  });

  const aiEnrichTable = useReactTable({
    data: displayRows,
    columns: aiEnrichColumns,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
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
      <CsvImportAiEnrichmentReviewModal
        open={aiEnrichModalOpen}
        onOpenChange={setAiEnrichModalOpen}
        rows={aiEnrichReviewRows}
        isApplying={aiEnrichApplying}
        onApplySelected={handleApplyAiEnrichmentSelection}
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
          <div className="flex h-full min-h-0 flex-col bg-background font-sans">
            <DialogHeader className="shrink-0 space-y-1 border-b border-border px-6 py-4 text-left">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-muted-foreground" aria-hidden />
                <DialogTitle className="font-heading text-lg">{t("previewTitle")}</DialogTitle>
              </div>
              <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
                {t("previewMeta", { fileName, count: displayRows.length, fields: fieldsSummary })}
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="preview" className="flex min-h-0 flex-1 flex-col gap-0">
              <div className="shrink-0 border-b border-border bg-background px-6 py-2">
              <TabsList variant="line" className="w-full justify-start sm:w-auto">
                <TabsTrigger value="preview" className="gap-1.5 px-3">
                  {t("previewTabPreview")}
                  {displayRows.length > 0 ? (
                    <Badge
                      variant="outline"
                      className="h-5 min-w-5 justify-center px-1.5 font-normal tabular-nums"
                    >
                      {displayRows.length}
                    </Badge>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="aiEnrich" className="gap-1.5 px-3">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                  {t("previewTabAiEnrich")}
                  {selectedRowCount > 0 ? (
                    <Badge
                      variant="secondary"
                      className="h-5 min-w-5 justify-center px-1.5 font-normal tabular-nums"
                    >
                      {selectedRowCount}
                    </Badge>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="problems" className="gap-1.5 px-3">
                  {t("previewTabProblems")}
                  {problemRows.length > 0 ? (
                    <Badge
                      variant="secondary"
                      className="h-5 min-w-5 justify-center px-1.5 font-normal tabular-nums"
                    >
                      {problemRows.length}
                    </Badge>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="duplicates" className="gap-1.5 px-3">
                  {t("previewTabDuplicates")}
                  {duplicateReviewCount > 0 ? (
                    <Badge
                      variant="secondary"
                      className="h-5 min-w-5 justify-center px-1.5 font-normal tabular-nums"
                    >
                      {duplicateReviewCount}
                    </Badge>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="guide" className="gap-1.5 px-3">
                  {t("previewTabGuide")}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent
              value="preview"
              className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden focus-visible:outline-none"
            >
              <div className={csvImportTabPanelClassName}>
                <CsvImportDataTable table={previewTable} />
                <div className="shrink-0 space-y-2 rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {t("previewImportIncludeHint")}
                  </p>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {t("previewVorschauAiPointer")}
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent
              value="aiEnrich"
              className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden focus-visible:outline-none"
            >
              <div className={csvImportTabPanelClassName}>
                <CsvImportDataTable table={aiEnrichTable} />
                <div className="shrink-0 space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {t("previewAiEnrichTabIntro", { max: String(CSV_IMPORT_AI_PREVIEW_MAX_ROWS) })}
                    {selectedRowCount > 0
                      ? ` ${t("previewAiEnrichSelected", { count: String(selectedRowCount) })}`
                      : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void handleRunAiEnrichmentPreview()}
                      disabled={busy || displayRows.length === 0 || selectedRowCount === 0}
                      title={selectedRowCount === 0 ? t("aiEnrichSelectRowsFirst") : undefined}
                    >
                      {aiEnrichLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                          {t("aiEnrichRunning")}
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" aria-hidden />
                          {selectedRowCount === 0
                            ? t("aiEnrichFooterButtonIdle")
                            : t("aiEnrichFooterButton", {
                                count: String(Math.min(selectedRowCount, CSV_IMPORT_AI_PREVIEW_MAX_ROWS)),
                              })}
                        </>
                      )}
                    </Button>
                    {aiPreviewResults !== null ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setAiEnrichModalOpen(true)}
                        disabled={busy}
                      >
                        {t("aiEnrichReviewAgain")}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent
              value="problems"
              className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden focus-visible:outline-none"
            >
              <div className={csvImportTabPanelClassName}>
                <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-card">
                  <Table className="w-max min-w-full text-sm">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className={cn(csvImportStickyTableHeadClassName)}>{t("duplicateColRow")}</TableHead>
                        <TableHead className={cn(csvImportStickyTableHeadClassName)}>{t("cols.firmenname")}</TableHead>
                        <TableHead className={cn(csvImportStickyTableHeadClassName)}>{t("coordProblemsColStatus")}</TableHead>
                        <TableHead className={cn(csvImportStickyTableHeadClassName)}>{t("cols.lat")}</TableHead>
                        <TableHead className={cn(csvImportStickyTableHeadClassName)}>{t("cols.lon")}</TableHead>
                        <TableHead className={cn(csvImportStickyTableHeadClassName)}>
                          {t("coordProblemsColHasAddress")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {problemRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-muted-foreground text-sm">
                            {t("coordProblemsEmpty")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        problemRows.map((row) => (
                          <TableRow key={row.rowId}>
                            <TableCell className="tabular-nums text-muted-foreground">{row.rowNumber}</TableCell>
                            <TableCell className="max-w-[240px] whitespace-normal wrap-break-word">
                              {row.firmenname}
                            </TableCell>
                            <TableCell className="whitespace-normal text-muted-foreground">{row.statusText}</TableCell>
                            <TableCell className="tabular-nums">{row.latText}</TableCell>
                            <TableCell className="tabular-nums">{row.lonText}</TableCell>
                            <TableCell>{row.hasAddress ? t("coordProblemsYes") : t("coordProblemsNo")}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="shrink-0 space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                  <div className="grid gap-3 sm:grid-cols-2 sm:text-sm lg:grid-cols-4">
                    <p className="text-sm">
                      <span className="font-medium text-foreground">{t("coordSummaryValid")}</span>
                      <span className="ml-1.5 tabular-nums text-muted-foreground">{coordinateSummary.validCount}</span>
                    </p>
                    <p className="text-sm">
                      <span className="font-medium text-foreground">{t("coordSummaryPartial")}</span>
                      <span className="ml-1.5 tabular-nums text-muted-foreground">{coordinateSummary.partialCount}</span>
                    </p>
                    <p className="text-sm">
                      <span className="font-medium text-foreground">{t("coordSummaryMissing")}</span>
                      <span className="ml-1.5 tabular-nums text-muted-foreground">{coordinateSummary.missingCount}</span>
                    </p>
                    <p className="text-sm">
                      <span className="font-medium text-foreground">{t("coordSummaryAddressFixable")}</span>
                      <span className="ml-1.5 tabular-nums text-muted-foreground">
                        {coordinateSummary.missingWithAddressCount}
                      </span>
                    </p>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {t("coordProblemsNotice", { count: String(problemRows.length) })}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void handleOpenGeocodePreview()}
                      disabled={busy || displayRows.length === 0 || geocodeCandidateCount === 0}
                      title={
                        geocodeCandidateCount === 0
                          ? t("coordGeocodeNoRows")
                          : t("coordGeocodeTitle")
                      }
                    >
                      {geocodeLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                          {t("coordGeocodeLoading")}
                        </>
                      ) : (
                        <>
                          <MapPin className="mr-2 h-4 w-4" aria-hidden />
                          {t("coordGeocodeButton")}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent
              value="duplicates"
              className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden focus-visible:outline-none"
            >
              <CsvImportDuplicateReviewPanel
                rows={displayRows}
                analyses={duplicateAnalyses}
                isLoading={duplicatePreviewLoading}
                error={duplicatePreviewError}
                forceImportByIndex={forceImportByIndex}
                onToggleForce={toggleDuplicateForce}
                onRetry={retryDuplicatePreview}
                isImporting={isImporting}
              />
            </TabsContent>

            <TabsContent
              value="guide"
              className={cn(
                "mt-0 min-h-0 flex-1 focus-visible:outline-none",
                csvImportTabPanelScrollClassName,
              )}
            >
              <div className="min-h-0 w-full min-w-0 pb-2">
                <CSVFieldGuide spacious />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex shrink-0 flex-col gap-3 border-t border-border bg-muted/30 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-col gap-1.5">
              {duplicatePreviewLoading ? (
                <p className="text-muted-foreground text-sm leading-relaxed">{t("previewFooterDuplicateChecking")}</p>
              ) : duplicatePreviewError !== null ? (
                <p className="text-muted-foreground text-sm leading-relaxed">{t("previewFooterDuplicateFailed")}</p>
              ) : importReady ? (
                importableCount === 0 ? (
                  <p className="text-muted-foreground text-sm leading-relaxed">{t("previewFooterImportNone")}</p>
                ) : duplicateImportAllForced ? (
                  <p className="text-amber-900/90 text-sm leading-relaxed dark:text-amber-100/90">
                    {t("previewFooterImportAllForced", {
                      count: importableCount,
                      flagged: duplicateReviewCount,
                    })}
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {t("previewFooterImportSummary", {
                        importable: importableCount,
                        total: displayRows.length,
                      })}
                    </p>
                    {duplicateSkippedCount > 0 ? (
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {t("previewFooterDupBlurb", { count: duplicateSkippedCount })}
                      </p>
                    ) : null}
                    {userExcludedEligibleCount > 0 ? (
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {t("previewFooterUserExBlurb", { count: userExcludedEligibleCount })}
                      </p>
                    ) : null}
                  </div>
                )
              ) : (
                <p className="text-muted-foreground text-sm leading-relaxed">{t("previewFooterDuplicateChecking")}</p>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={busy}
              >
                {t("previewCancel")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={onBackToEdit}
                disabled={busy}
              >
                {t("previewBack")}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const forceImportRowIndices = Object.entries(forceImportByIndex)
                    .filter(([, v]) => v === true)
                    .map(([k]) => Number(k));
                  const excludeImportRowIndices = Object.entries(importExcludedByIndex)
                    .filter(([, v]) => v === true)
                    .map(([k]) => Number(k));
                  void onImportRows(displayRows, { forceImportRowIndices, excludeImportRowIndices });
                }}
                disabled={busy || !importReady || importableCount === 0}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    {t("previewImporting")}
                  </>
                ) : duplicatePreviewLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    {t("duplicateChecking")}
                  </>
                ) : (
                  t("previewImport", { count: importableCount })
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
