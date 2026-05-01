"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useT } from "@/lib/i18n/use-translations";

export type CsvImportAiEnrichmentReviewRow = {
  rowId: string;
  rowIndex: number;
  firmenname: string;
  ok: boolean;
  errorMessage?: string;
  mergeFieldCount: number;
  modelUsed?: string;
};

export type CsvImportAiEnrichmentReviewModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: CsvImportAiEnrichmentReviewRow[];
  isApplying: boolean;
  onApplySelected: (rowIndices: number[]) => void | Promise<void>;
};

function isSelectableRow(row: CsvImportAiEnrichmentReviewRow): boolean {
  return row.ok && row.mergeFieldCount > 0;
}

export function CsvImportAiEnrichmentReviewModal({
  open,
  onOpenChange,
  rows,
  isApplying,
  onApplySelected,
}: CsvImportAiEnrichmentReviewModalProps) {
  const t = useT("csvImport");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open) {
      setSelected({});
    }
  }, [open]);

  const selectableIds = useMemo(() => rows.filter(isSelectableRow).map((row) => row.rowId), [rows]);

  const selectedCount = useMemo(() => {
    let count = 0;
    for (const id of selectableIds) {
      if (selected[id] === true) {
        count += 1;
      }
    }
    return count;
  }, [selectableIds, selected]);

  const toggleRow = useCallback((rowId: string, next: boolean) => {
    setSelected((prev) => ({ ...prev, [rowId]: next }));
  }, []);

  const handleSelectAllValid = useCallback(() => {
    const next: Record<string, boolean> = {};
    for (const row of rows) {
      if (isSelectableRow(row)) {
        next[row.rowId] = true;
      }
    }
    setSelected(next);
  }, [rows]);

  const handleClearSelection = useCallback(() => {
    setSelected({});
  }, []);

  const handleApply = useCallback(() => {
    const indices: number[] = [];
    for (const row of rows) {
      if (selected[row.rowId] === true && isSelectableRow(row)) {
        indices.push(row.rowIndex);
      }
    }
    void onApplySelected(indices);
  }, [onApplySelected, rows, selected]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("aiEnrichReviewTitle")}</DialogTitle>
          <DialogDescription>{t("aiEnrichReviewDescription")}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border">
          <Table className="table-fixed">
            <colgroup>
              <col className="w-10" />
              <col className="w-14" />
              <col className="w-[28%]" />
              <col className="w-[22%]" />
              <col />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>{t("aiEnrichReviewColRow")}</TableHead>
                <TableHead>{t("aiEnrichReviewColCompany")}</TableHead>
                <TableHead>{t("aiEnrichReviewColFields")}</TableHead>
                <TableHead>{t("aiEnrichReviewColStatus")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const selectable = isSelectableRow(row);
                const checked = selected[row.rowId] === true;
                return (
                  <TableRow key={row.rowId} className="align-top">
                    <TableCell className="pt-3">
                      <Checkbox
                        checked={checked}
                        disabled={!selectable || isApplying}
                        onCheckedChange={(value) => {
                          toggleRow(row.rowId, value === true);
                        }}
                        aria-label={t("aiEnrichReviewSelectRowAria", { row: String(row.rowIndex + 1) })}
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground text-sm">
                      {row.rowIndex + 1}
                    </TableCell>
                    <TableCell
                      className="whitespace-normal wrap-break-word font-medium text-sm leading-snug"
                      title={row.firmenname}
                    >
                      {row.firmenname}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {row.ok && row.mergeFieldCount > 0 ? (
                        <Badge variant="secondary" className="font-normal tabular-nums">
                          {t("aiEnrichReviewFieldsCount", { count: row.mergeFieldCount })}
                        </Badge>
                      ) : row.ok ? (
                        <span className="text-muted-foreground text-sm">{t("aiEnrichReviewNoFill")}</span>
                      ) : (
                        <span className="text-destructive text-sm">{row.errorMessage ?? t("aiEnrichReviewFailed")}</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-normal wrap-break-word text-muted-foreground text-xs leading-snug">
                      {row.ok && row.modelUsed ? row.modelUsed : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleSelectAllValid} disabled={isApplying}>
              {t("aiEnrichReviewSelectAll")}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleClearSelection} disabled={isApplying}>
              {t("aiEnrichReviewClearSelection")}
            </Button>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isApplying}>
              {t("aiEnrichReviewCancel")}
            </Button>
            <Button type="button" onClick={handleApply} disabled={isApplying || selectedCount === 0}>
              {isApplying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  {t("aiEnrichReviewApplying")}
                </>
              ) : selectedCount > 0 ? (
                t("aiEnrichReviewApplyN", { count: selectedCount })
              ) : (
                t("aiEnrichReviewApply")
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
