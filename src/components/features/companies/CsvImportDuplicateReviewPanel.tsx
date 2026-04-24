"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import {
  csvImportStickyTableHeadClassName,
  csvImportTabPanelClassName,
} from "@/components/features/companies/CSVFieldGuide";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type CsvImportDuplicateExisting,
  type CsvImportDuplicateRowAnalysis,
  rowNeedsDuplicateReview,
} from "@/lib/companies/csv-import-dedupe";
import { useT } from "@/lib/i18n/use-translations";
import { cn } from "@/lib/utils";
import type { ParsedCompanyRow } from "@/lib/utils/csv-import";

export type CsvImportDuplicateReviewPanelProps = {
  rows: ParsedCompanyRow[];
  analyses: CsvImportDuplicateRowAnalysis[] | null;
  isLoading: boolean;
  error: string | null;
  forceImportByIndex: Record<number, boolean>;
  onToggleForce: (rowIndex: number, checked: boolean) => void;
  onRetry?: () => void;
  isImporting: boolean;
};

function csvSummary(row: ParsedCompanyRow, dash: string): string {
  const parts = [row.firmenname, row.plz, row.ort].filter((p) => (p?.trim() ?? "") !== "");
  return parts.length > 0 ? parts.join(" · ") : dash;
}

function existingSummary(existing: CsvImportDuplicateExisting | null | undefined, dash: string): string {
  if (existing === null || existing === undefined) return dash;
  const parts = [existing.firmenname, existing.plz, existing.stadt].filter(
    (p) => (p?.trim() ?? "") !== "",
  );
  return parts.length > 0 ? parts.join(" · ") : dash;
}

export function CsvImportDuplicateReviewPanel({
  rows,
  analyses,
  isLoading,
  error,
  forceImportByIndex,
  onToggleForce,
  onRetry,
  isImporting,
}: CsvImportDuplicateReviewPanelProps) {
  const t = useT("csvImport");
  const tCommon = useT("common");
  const dash = tCommon("dash");

  const duplicateRows = useMemo(
    () => (analyses === null ? [] : analyses.filter(rowNeedsDuplicateReview)),
    [analyses],
  );

  if (isLoading) {
    return (
      <div className={cn(csvImportTabPanelClassName, "items-center justify-center")}>
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
          <p className="text-sm leading-relaxed">{t("duplicateChecking")}</p>
        </div>
      </div>
    );
  }

  if (error !== null) {
    return (
      <div className={cn(csvImportTabPanelClassName, "space-y-4")}>
        <Alert variant="destructive">
          <AlertTitle>{t("toastDuplicatePreviewFailed")}</AlertTitle>
          <AlertDescription className="text-sm leading-relaxed">{error}</AlertDescription>
        </Alert>
        {onRetry !== undefined ? (
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            {t("duplicateRetry")}
          </Button>
        ) : null}
      </div>
    );
  }

  if (analyses === null) {
    return null;
  }

  return (
    <div className={csvImportTabPanelClassName}>
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-card">
        {duplicateRows.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm leading-relaxed">{t("duplicateTabEmpty")}</div>
        ) : (
          <Table className="table-fixed text-sm">
            <colgroup>
              <col className="w-12" />
              <col className="w-[14%]" />
              <col className="w-[28%]" />
              <col className="w-[28%]" />
              <col className="w-[10%]" />
              <col />
            </colgroup>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={cn("w-12", csvImportStickyTableHeadClassName)}>{t("duplicateColRow")}</TableHead>
                <TableHead className={csvImportStickyTableHeadClassName}>{t("duplicateColCsv")}</TableHead>
                <TableHead className={csvImportStickyTableHeadClassName}>{t("duplicateColExisting")}</TableHead>
                <TableHead className={csvImportStickyTableHeadClassName}>{t("duplicateColReason")}</TableHead>
                <TableHead className={cn("text-center", csvImportStickyTableHeadClassName)}>
                  {t("duplicateColImportAnyway")}
                </TableHead>
                <TableHead className={cn("w-20", csvImportStickyTableHeadClassName)} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {duplicateRows.map((analysis) => {
                const row = rows[analysis.rowIndex];
                const rowNumber = analysis.rowIndex + 1;
                const db = analysis.dbMatch;
                const internalDup = analysis.internalDuplicate;
                const forceId = `csv-dup-tab-force-${String(analysis.rowIndex)}`;
                return (
                  <TableRow key={analysis.rowIndex} className="align-top">
                    <TableCell className="tabular-nums text-muted-foreground text-sm">{rowNumber}</TableCell>
                    <TableCell className="whitespace-normal wrap-break-word text-sm leading-snug">
                      {row !== undefined ? csvSummary(row, dash) : dash}
                    </TableCell>
                    <TableCell className="whitespace-normal wrap-break-word text-sm leading-snug">
                      {db !== null ? existingSummary(db.existing, dash) : dash}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <div className="flex flex-wrap gap-1">
                        {db !== null ? (
                          <Badge variant="secondary" className="font-normal">
                            {db.tier === "osm"
                              ? t("duplicateTierOsm")
                              : db.tier === "website"
                                ? t("duplicateTierWebsite")
                                : db.tier === "name_plz_city"
                                  ? t("duplicateTierNamePlzCity")
                                  : t("duplicateTierNameOnly")}
                          </Badge>
                        ) : null}
                        {internalDup !== null ? (
                          <Badge variant="outline" className="font-normal">
                            {t("duplicateBadgeFile")}
                          </Badge>
                        ) : null}
                        {internalDup !== null ? (
                          <span className="w-full text-muted-foreground text-xs">
                            {t("duplicateInternalHint", { row: internalDup.firstRowIndex + 1 })}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        id={forceId}
                        checked={forceImportByIndex[analysis.rowIndex] === true}
                        disabled={isImporting}
                        onCheckedChange={(v) => {
                          onToggleForce(analysis.rowIndex, v === true);
                        }}
                        aria-label={t("duplicateColImportAnyway")}
                      />
                    </TableCell>
                    <TableCell className="text-end">
                      {db !== null ? (
                        <Button variant="link" className="h-auto p-0 text-sm" asChild>
                          <Link href={`/companies/${db.existing.id}`} target="_blank" rel="noopener noreferrer">
                            {t("duplicateOpenRecord")}
                          </Link>
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="shrink-0 space-y-2 rounded-lg border border-border bg-muted/30 p-4">
        <div>
          <p className="font-heading font-medium text-foreground text-sm">{t("duplicateAlertTitle")}</p>
          <p className="mt-1.5 text-muted-foreground text-sm leading-relaxed">{t("duplicateAlertBody")}</p>
        </div>
      </div>
    </div>
  );
}
