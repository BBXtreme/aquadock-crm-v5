"use client";

import {
  type ColumnDef,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { useMemo } from "react";

import {
  CSVFieldGuide,
  csvImportFullscreenDialogContentClassName,
  csvImportFullscreenOverlayClassName,
} from "@/components/features/companies/CSVFieldGuide";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const columnHelper = createColumnHelper<ParsedCompanyRow>();

export interface CSVPreviewViewProps {
  open: boolean;
  rows: ParsedCompanyRow[];
  fileName: string;
  isImporting: boolean;
  onImportNow: () => void;
  onBackToEdit: () => void;
  onCancel: () => void;
}

export function CSVPreviewView({
  open,
  rows,
  fileName,
  isImporting,
  onImportNow,
  onBackToEdit,
  onCancel,
}: CSVPreviewViewProps) {
  const t = useT("csvImport");
  const tCommon = useT("common");
  const dash = tCommon("dash");
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
              return <span className="whitespace-nowrap">{n !== undefined ? n.toFixed(4) : dash}</span>;
            }
            return <span className="whitespace-nowrap">{cellString(value as string | number | undefined, dash)}</span>;
          },
        }),
      ) as ColumnDef<ParsedCompanyRow>[],
    [t, dash],
  );
  const detectedKeys = useMemo(() => getDetectedColumnKeys(rows), [rows]);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (_row, index) => `csv-preview-row-${String(index)}`,
  });

  const fieldsSummary =
    detectedKeys.length > 0 ? detectedKeys.join(", ") : t("previewMetaNoFields");

  return (
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
              {t("previewMeta", { fileName, count: rows.length, fields: fieldsSummary })}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="preview" className="flex min-h-0 flex-1 flex-col gap-0">
            <div className="shrink-0 border-b border-border px-6 py-2">
              <TabsList variant="line" className="w-full justify-start sm:w-auto">
                <TabsTrigger value="preview" className="px-3">
                  {t("previewTabPreview")}
                </TabsTrigger>
                <TabsTrigger value="guide" className="px-3">
                  {t("previewTabGuide")}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="preview" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden focus-visible:outline-none">
              <div className="min-h-0 flex-1 overflow-auto px-4 py-3 sm:px-6">
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

            <TabsContent value="guide" className="mt-0 flex min-h-0 flex-1 overflow-auto px-4 py-3 sm:px-6 focus-visible:outline-none">
              <CSVFieldGuide spacious />
            </TabsContent>
          </Tabs>

          <div className="flex shrink-0 flex-col gap-3 border-t border-border bg-muted/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-muted-foreground text-xs sm:text-sm">{t("previewFooter", { count: rows.length })}</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isImporting}>
                {t("previewCancel")}
              </Button>
              <Button type="button" variant="secondary" onClick={onBackToEdit} disabled={isImporting}>
                {t("previewBack")}
              </Button>
              <Button type="button" onClick={onImportNow} disabled={isImporting || rows.length === 0}>
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    {t("previewImporting")}
                  </>
                ) : (
                  t("previewImport", { count: rows.length })
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
