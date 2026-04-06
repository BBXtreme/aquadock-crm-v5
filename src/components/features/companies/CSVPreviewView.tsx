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

const COLUMN_LABELS: Record<keyof ParsedCompanyRow, string> = {
  firmenname: "Firmenname",
  kundentyp: "Kundentyp",
  wasser_distanz: "Wasserdistanz (m)",
  wassertyp: "Wassertyp",
  strasse: "Straße",
  plz: "PLZ",
  ort: "Ort",
  bundesland: "Bundesland",
  land: "Land",
  telefon: "Telefon",
  website: "Website",
  email: "E-Mail",
  lat: "Lat",
  lon: "Lon",
  osm: "OSM",
};

function cellString(value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === "") {
    return "—";
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

function buildColumns(): ColumnDef<ParsedCompanyRow>[] {
  return PREVIEW_FIELD_KEYS.map((key) =>
    columnHelper.accessor(key, {
      id: key,
      header: COLUMN_LABELS[key],
      cell: (info) => {
        const value = info.getValue();
        if (key === "lat" || key === "lon") {
          const n = value as number | undefined;
          return <span className="whitespace-nowrap">{n !== undefined ? n.toFixed(4) : "—"}</span>;
        }
        return <span className="whitespace-nowrap">{cellString(value as string | number | undefined)}</span>;
      },
    }),
  ) as ColumnDef<ParsedCompanyRow>[];
}

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
  const columns = useMemo(() => buildColumns(), []);
  const detectedKeys = useMemo(() => getDetectedColumnKeys(rows), [rows]);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (_row, index) => `csv-preview-row-${String(index)}`,
  });

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
              <DialogTitle className="text-lg">CSV-Vorschau</DialogTitle>
            </div>
            <DialogDescription className="text-muted-foreground text-sm">
              {fileName} · {rows.length} Zeilen · erkannte Felder: {detectedKeys.length > 0 ? detectedKeys.join(", ") : "—"}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="preview" className="flex min-h-0 flex-1 flex-col gap-0">
            <div className="shrink-0 border-b border-border px-6 py-2">
              <TabsList variant="line" className="w-full justify-start sm:w-auto">
                <TabsTrigger value="preview" className="px-3">
                  Vorschau
                </TabsTrigger>
                <TabsTrigger value="guide" className="px-3">
                  Feldreferenz
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
            <p className="text-muted-foreground text-xs sm:text-sm">
              {rows.length} Datensätze werden importiert. Bitte prüfen Sie die Vorschau, bevor Sie fortfahren.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isImporting}>
                Abbrechen
              </Button>
              <Button type="button" variant="secondary" onClick={onBackToEdit} disabled={isImporting}>
                Zurück zur Bearbeitung
              </Button>
              <Button type="button" onClick={onImportNow} disabled={isImporting || rows.length === 0}>
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Import läuft…
                  </>
                ) : (
                  `Jetzt importieren (${rows.length})`
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
