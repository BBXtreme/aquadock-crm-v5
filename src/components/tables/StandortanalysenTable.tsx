"use client";

import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { Contact, Eye, Pencil, Trash } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type StandortanalyseListItem = {
  id: string;
  status: "draft" | "submitted" | "completed";
  created_at: string;
  updated_at: string;
  total_points: number;
  recommendation: string;
  standort_ort: string;
  kontakt_name: string;
  submitted_at: string | null;
};

export type StandortanalyseListFilter = "all" | "draft" | "submitted";

type StandortanalyseActionCellProps = {
  analysis: StandortanalyseListItem;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onSyncCrm: (id: string, options: { createContact: boolean; createCompany: boolean }) => void;
  onDelete: (id: string) => void;
  loadingId: string | null;
  syncingId: string | null;
  deletingId: string | null;
};

function formatDateTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function statusLabel(status: StandortanalyseListItem["status"]): string {
  return status === "draft" ? "Entwurf" : "Abgeschlossen";
}

function StandortanalyseActionCell({
  analysis,
  onView,
  onEdit,
  onSyncCrm,
  onDelete,
  loadingId,
  syncingId,
  deletingId,
}: StandortanalyseActionCellProps) {
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createContact, setCreateContact] = useState(true);
  const [createCompany, setCreateCompany] = useState(true);

  const analysisLabel = `${analysis.kontakt_name} (${analysis.standort_ort})`;

  return (
    <div className="flex justify-end space-x-2">
      <AlertDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Analyse ansehen"
            disabled={loadingId === analysis.id}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Analyse ansehen?</AlertDialogTitle>
            <AlertDialogDescription>
              Die Analyse {analysisLabel} wird zur Zusammenfassung bzw. Auswertung geöffnet. Nicht gespeicherte Änderungen
              am aktuellen Formular können dabei verloren gehen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onView(analysis.id);
                setViewDialogOpen(false);
              }}
            >
              Ansehen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Analyse bearbeiten"
            disabled={loadingId === analysis.id}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Analyse bearbeiten?</AlertDialogTitle>
            <AlertDialogDescription>
              Die Analyse {analysisLabel} wird im Formular geladen (Schritt Stammdaten). Nicht gespeicherte Änderungen am
              aktuellen Formular können dabei verloren gehen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onEdit(analysis.id);
                setEditDialogOpen(false);
              }}
            >
              Bearbeiten
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={syncDialogOpen}
        onOpenChange={(open) => {
          setSyncDialogOpen(open);
          if (open) {
            setCreateContact(true);
            setCreateCompany(true);
          }
        }}
      >
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Im CRM übernehmen"
            disabled={syncingId === analysis.id}
          >
            <Contact className="h-4 w-4" aria-hidden />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Im CRM übernehmen?</AlertDialogTitle>
            <AlertDialogDescription>
              Kontakt und Firma aus der Analyse {analysisLabel} werden im CRM angelegt oder mit bestehenden Einträgen
              verknüpft.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 rounded-md border bg-muted/40 p-3 text-sm">
            <div className="flex items-center gap-2">
              <Checkbox
                id={`sync-contact-${analysis.id}`}
                checked={createContact}
                onCheckedChange={(checked) => setCreateContact(checked === true)}
                disabled={syncingId === analysis.id}
              />
              <Label htmlFor={`sync-contact-${analysis.id}`} className="cursor-pointer font-normal">
                Kontakt erstellen/aktualisieren
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id={`sync-company-${analysis.id}`}
                checked={createCompany}
                onCheckedChange={(checked) => setCreateCompany(checked === true)}
                disabled={syncingId === analysis.id}
              />
              <Label htmlFor={`sync-company-${analysis.id}`} className="cursor-pointer font-normal">
                Firma erstellen/aktualisieren
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Wenn beide Optionen gewählt sind, werden Kontakt und Firma automatisch miteinander verknüpft.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onSyncCrm(analysis.id, { createContact, createCompany });
                setSyncDialogOpen(false);
              }}
              disabled={!createContact && !createCompany}
            >
              Übernehmen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="ghost" size="sm" aria-label="Analyse löschen" disabled={deletingId === analysis.id}>
            <Trash className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Analyse löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              {analysisLabel} wird dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(analysis.id);
                setDeleteDialogOpen(false);
              }}
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const columnHelper = createColumnHelper<StandortanalyseListItem>();

export type StandortanalysenTableProps = {
  analyses: StandortanalyseListItem[];
  loading?: boolean;
  statusFilter: StandortanalyseListFilter;
  onStatusFilterChange: (filter: StandortanalyseListFilter) => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onSyncCrm: (id: string, options: { createContact: boolean; createCompany: boolean }) => void;
  onDelete: (id: string) => void;
  loadingId?: string | null;
  syncingId?: string | null;
  deletingId?: string | null;
};

export default function StandortanalysenTable({
  analyses,
  loading = false,
  statusFilter,
  onStatusFilterChange,
  onView,
  onEdit,
  onSyncCrm,
  onDelete,
  loadingId = null,
  syncingId = null,
  deletingId = null,
}: StandortanalysenTableProps) {
  const localeTag = "de-DE";

  const columnMenuLabel = useCallback((id: string) => {
    const map: Record<string, string> = {
      status: "Status",
      kontakt_name: "Kontakt",
      standort_ort: "Ort",
      total_points: "Punkte",
      recommendation: "Empfehlung",
      updated_at: "Aktualisiert",
      created_at: "Erstellt",
      submitted_at: "Abgeschlossen am",
      actions: "Aktionen",
    };
    return map[id] ?? id;
  }, []);

  const dataTableLabels = useMemo(
    () => ({
      exportCsv: "CSV exportieren",
      exportJson: "JSON exportieren",
      rowsPerPage: "Zeilen pro Seite",
      previous: "Zurück",
      next: "Weiter",
      empty: "Noch keine gespeicherten Standortanalysen vorhanden.",
      columnsTriggerAria: "Spalten ein- oder ausblenden",
      exportTriggerAria: "Daten exportieren",
      rowSelectionSummary: (selected: number, total: number) => `${selected} von ${total} Zeile(n) ausgewählt.`,
      pageRangeSummary: (from: number, to: number, total: number) =>
        total <= 0
          ? "Keine Einträge."
          : `Zeilen ${from.toLocaleString(localeTag)}–${to.toLocaleString(localeTag)} von ${total.toLocaleString(localeTag)}`,
    }),
    [],
  );

  const columns = useMemo<ColumnDef<StandortanalyseListItem>[]>(
    () => [
      columnHelper.accessor("status", {
        id: "status",
        header: "Status",
        enableSorting: true,
        cell: (info) => (
          <Badge variant={info.getValue() === "draft" ? "secondary" : "default"}>{statusLabel(info.getValue())}</Badge>
        ),
      }) as ColumnDef<StandortanalyseListItem>,
      columnHelper.accessor("kontakt_name", {
        id: "kontakt_name",
        header: "Kontakt",
        enableSorting: true,
      }) as ColumnDef<StandortanalyseListItem>,
      columnHelper.accessor("standort_ort", {
        id: "standort_ort",
        header: "Ort",
        enableSorting: true,
      }) as ColumnDef<StandortanalyseListItem>,
      columnHelper.accessor("total_points", {
        id: "total_points",
        header: "Punkte",
        enableSorting: true,
      }) as ColumnDef<StandortanalyseListItem>,
      columnHelper.accessor("recommendation", {
        id: "recommendation",
        header: "Empfehlung",
        enableSorting: true,
      }) as ColumnDef<StandortanalyseListItem>,
      columnHelper.accessor("updated_at", {
        id: "updated_at",
        header: "Aktualisiert",
        enableSorting: true,
        sortingFn: (rowA, rowB) =>
          new Date(rowA.original.updated_at).getTime() - new Date(rowB.original.updated_at).getTime(),
        cell: (info) => formatDateTime(info.getValue(), localeTag),
      }) as ColumnDef<StandortanalyseListItem>,
      columnHelper.accessor("created_at", {
        id: "created_at",
        header: "Erstellt",
        enableSorting: true,
        sortingFn: (rowA, rowB) =>
          new Date(rowA.original.created_at).getTime() - new Date(rowB.original.created_at).getTime(),
        cell: (info) => formatDateTime(info.getValue(), localeTag),
      }) as ColumnDef<StandortanalyseListItem>,
      columnHelper.accessor("submitted_at", {
        id: "submitted_at",
        header: "Abgeschlossen am",
        enableSorting: true,
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.submitted_at ? new Date(rowA.original.submitted_at).getTime() : 0;
          const b = rowB.original.submitted_at ? new Date(rowB.original.submitted_at).getTime() : 0;
          return a - b;
        },
        cell: (info) => {
          const value = info.getValue();
          return value != null ? formatDateTime(value, localeTag) : "—";
        },
      }) as ColumnDef<StandortanalyseListItem>,
      columnHelper.display({
        id: "actions",
        header: "Aktionen",
        enableSorting: false,
        enableHiding: false,
        cell: (info) => (
          <StandortanalyseActionCell
            analysis={info.row.original}
            onView={onView}
            onEdit={onEdit}
            onSyncCrm={onSyncCrm}
            onDelete={onDelete}
            loadingId={loadingId}
            syncingId={syncingId}
            deletingId={deletingId}
          />
        ),
      }) as ColumnDef<StandortanalyseListItem>,
    ],
    [deletingId, loadingId, onDelete, onEdit, onSyncCrm, onView, syncingId],
  );

  return (
    <div className="space-y-4">
      <Select value={statusFilter} onValueChange={(value) => onStatusFilterChange(value as StandortanalyseListFilter)}>
        <SelectTrigger className="max-w-xs">
          <SelectValue placeholder="Status filtern" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle</SelectItem>
          <SelectItem value="draft">Nur Entwürfe</SelectItem>
          <SelectItem value="submitted">Nur abgeschlossen</SelectItem>
        </SelectContent>
      </Select>

      <DataTable
        columns={columns}
        data={analyses}
        loading={loading}
        pageSize={20}
        searchPlaceholder="Suche nach Kontakt oder Ort"
        columnMenuLabel={columnMenuLabel}
        labels={dataTableLabels}
        initialSorting={[{ id: "updated_at", desc: true }]}
        initialColumnVisibility={{
          recommendation: false,
          created_at: false,
          submitted_at: false,
        }}
      />
    </div>
  );
}
