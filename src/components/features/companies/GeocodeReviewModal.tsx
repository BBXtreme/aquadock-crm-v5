"use client";

import { ArrowRight, Loader2 } from "lucide-react";
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
import type { GeocodeBatchPreviewRow } from "@/lib/actions/companies";

export type GeocodeReviewModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: GeocodeBatchPreviewRow[];
  isApplying: boolean;
  onApplySelected: (rowIds: string[]) => void | Promise<void>;
};

function formatCoord(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return value.toFixed(5);
}

function formatCoordPair(lat: number | null, lon: number | null): string {
  if (lat === null && lon === null) return "—";
  return `${formatCoord(lat)}, ${formatCoord(lon)}`;
}

/**
 * Stacked "current → suggested" diff view for the coordinates column.
 * Renders as a single cell so the review modal reads like a change set,
 * not two parallel data columns. Saves ~110px of horizontal space that
 * would otherwise push long addresses into neighbouring cells.
 */
function CoordinateDiff({ row }: { row: GeocodeBatchPreviewRow }) {
  const hasCurrent = row.currentLat !== null && row.currentLon !== null;
  const hasSuggested = row.suggestedLat !== null && row.suggestedLon !== null;

  if (!hasCurrent && hasSuggested) {
    return (
      <div className="flex items-center gap-1 whitespace-nowrap tabular-nums text-xs">
        <ArrowRight className="h-3 w-3 text-muted-foreground" aria-hidden />
        <span className="font-semibold">{formatCoordPair(row.suggestedLat, row.suggestedLon)}</span>
      </div>
    );
  }

  if (hasCurrent && !hasSuggested) {
    return (
      <span className="whitespace-nowrap tabular-nums text-muted-foreground text-xs">
        {formatCoordPair(row.currentLat, row.currentLon)}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 whitespace-nowrap tabular-nums text-xs leading-tight">
      <span className="text-muted-foreground">
        {formatCoordPair(row.currentLat, row.currentLon)}
      </span>
      <span className="flex items-center gap-1 font-semibold">
        <ArrowRight className="h-3 w-3 text-muted-foreground" aria-hidden />
        {formatCoordPair(row.suggestedLat, row.suggestedLon)}
      </span>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: GeocodeBatchPreviewRow["confidence"] }) {
  if (confidence === "high") {
    return (
      <Badge className="border-emerald-600/40 bg-emerald-600/15 text-emerald-900 dark:text-emerald-100">
        Hoch
      </Badge>
    );
  }
  if (confidence === "medium") {
    return (
      <Badge className="border-amber-600/40 bg-amber-500/15 text-amber-950 dark:text-amber-100">
        Mittel
      </Badge>
    );
  }
  if (confidence === "low") {
    return (
      <Badge className="border-red-600/40 bg-red-600/10 text-red-900 dark:text-red-100">Niedrig</Badge>
    );
  }
  return <Badge variant="outline">—</Badge>;
}

function isSelectableRow(row: GeocodeBatchPreviewRow): boolean {
  return row.ok && row.suggestedLat !== null && row.suggestedLon !== null;
}

export function GeocodeReviewModal({
  open,
  onOpenChange,
  rows,
  isApplying,
  onApplySelected,
}: GeocodeReviewModalProps) {
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
    const ids: string[] = [];
    for (const row of rows) {
      if (selected[row.rowId] === true && isSelectableRow(row)) {
        ids.push(row.rowId);
      }
    }
    void onApplySelected(ids);
  }, [onApplySelected, rows, selected]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Geocoding prüfen</DialogTitle>
          <DialogDescription>
            Vorschläge von OpenStreetMap Nominatim. Nur ausgewählte Zeilen werden übernommen.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border">
          <Table className="table-fixed">
            {/* Explicit column widths so long addresses wrap in place instead
                of overflowing into the coordinates cell. */}
            <colgroup>
              <col className="w-10" />
              <col className="w-[18%]" />
              <col className="w-[26%]" />
              <col className="w-[22%]" />
              <col className="w-[10%]" />
              <col />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Firma</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead>Koordinaten</TableHead>
                <TableHead>Qualität</TableHead>
                <TableHead>Hinweis</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const selectable = isSelectableRow(row);
                const checked = selected[row.rowId] === true;
                const hint = row.message ?? row.displayName ?? "—";
                return (
                  <TableRow key={row.rowId} className="align-top">
                    <TableCell className="pt-3">
                      <Checkbox
                        checked={checked}
                        disabled={!selectable || isApplying}
                        onCheckedChange={(value) => {
                          toggleRow(row.rowId, value === true);
                        }}
                        aria-label={`Zeile ${row.rowId} auswählen`}
                      />
                    </TableCell>
                    <TableCell
                      className="whitespace-normal wrap-break-word font-medium text-sm leading-snug"
                      title={row.firmenname ?? undefined}
                    >
                      {row.firmenname ?? "—"}
                    </TableCell>
                    <TableCell
                      className="whitespace-normal wrap-break-word text-muted-foreground text-xs leading-snug"
                      title={row.addressLabel}
                    >
                      {row.addressLabel}
                    </TableCell>
                    <TableCell>
                      <CoordinateDiff row={row} />
                    </TableCell>
                    <TableCell>
                      <ConfidenceBadge confidence={row.confidence} />
                    </TableCell>
                    <TableCell
                      className="whitespace-normal wrap-break-word text-muted-foreground text-xs leading-snug"
                      title={typeof hint === "string" ? hint : undefined}
                    >
                      {hint}
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
              Alle gültigen auswählen
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleClearSelection} disabled={isApplying}>
              Auswahl leeren
            </Button>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isApplying}>
              Abbrechen
            </Button>
            <Button type="button" onClick={handleApply} disabled={isApplying || selectedCount === 0}>
              {isApplying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Übernehmen …
                </>
              ) : selectedCount > 0 ? (
                `${String(selectedCount)} übernehmen`
              ) : (
                "Auswahl übernehmen"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
