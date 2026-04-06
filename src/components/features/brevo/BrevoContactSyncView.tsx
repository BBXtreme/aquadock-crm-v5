// src/components/features/brevo/BrevoContactSyncView.tsx
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type OnChangeFn,
  type RowSelectionState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  ChevronDown,
  ClipboardCopy,
  CloudUpload,
  ExternalLink,
  Hash,
  Loader2,
  MailWarning,
  Search,
  Sparkles,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  BREVO_CONTACT_SYNC_COLUMN_COUNT,
  BREVO_CONTACT_SYNC_SKELETON_COL_KEYS,
  BREVO_CONTACT_SYNC_SKELETON_ROW_KEYS,
  type BrevoContactSyncRow,
  brevoContactSyncColumns,
  brevoContactSyncGlobalFilterFn,
} from "@/components/features/brevo/brevo-contact-columns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchBrevoListsAction, importBrevoContactsBulkAction } from "@/lib/actions/brevo";
import { kundentypOptions, statusOptions } from "@/lib/constants/company-options";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

/** Brevo web app — contacts & lists (import runs asynchronously server-side). */
const BREVO_APP_CONTACTS_URL = "https://app.brevo.com/contact/list-listing";

const brevoContactSyncQueryKey = ["brevo-contact-sync-contacts"] as const;
const brevoSyncListsQueryKey = ["brevo-contact-sync-brevo-lists"] as const;

const KUNDENTYP_FILTER_ID = "companies.kundentyp";
const STATUS_FILTER_ID = "companies.status";

function useBrevoContactSyncContacts() {
  return useQuery({
    queryKey: brevoContactSyncQueryKey,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("contacts")
        .select("*, companies(firmenname, kundentyp, status)");
      if (error) throw error;
      return data as BrevoContactSyncRow[];
    },
    staleTime: 60 * 1000,
  });
}

function useBrevoContactSyncFilters() {
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const kundentypSelected = useMemo(() => {
    const f = columnFilters.find((c) => c.id === KUNDENTYP_FILTER_ID);
    return (f?.value as string[] | undefined) ?? [];
  }, [columnFilters]);

  const statusSelected = useMemo(() => {
    const f = columnFilters.find((c) => c.id === STATUS_FILTER_ID);
    return (f?.value as string[] | undefined) ?? [];
  }, [columnFilters]);

  const clearKundentyp = useCallback(() => {
    setColumnFilters((prev) => prev.filter((c) => c.id !== KUNDENTYP_FILTER_ID));
  }, []);

  const clearStatus = useCallback(() => {
    setColumnFilters((prev) => prev.filter((c) => c.id !== STATUS_FILTER_ID));
  }, []);

  const toggleKundentyp = useCallback((value: string) => {
    setColumnFilters((prev) => {
      const rest = prev.filter((c) => c.id !== KUNDENTYP_FILTER_ID);
      const current = (prev.find((c) => c.id === KUNDENTYP_FILTER_ID)?.value as string[] | undefined) ?? [];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      if (next.length === 0) return rest;
      return [...rest, { id: KUNDENTYP_FILTER_ID, value: next }];
    });
  }, []);

  const toggleStatus = useCallback((value: string) => {
    setColumnFilters((prev) => {
      const rest = prev.filter((c) => c.id !== STATUS_FILTER_ID);
      const current = (prev.find((c) => c.id === STATUS_FILTER_ID)?.value as string[] | undefined) ?? [];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      if (next.length === 0) return rest;
      return [...rest, { id: STATUS_FILTER_ID, value: next }];
    });
  }, []);

  return {
    globalFilter,
    setGlobalFilter,
    columnFilters,
    setColumnFilters,
    kundentypSelected,
    statusSelected,
    clearKundentyp,
    clearStatus,
    toggleKundentyp,
    toggleStatus,
  };
}

function useBrevoContactSyncTable(
  data: BrevoContactSyncRow[],
  globalFilter: string,
  setGlobalFilter: OnChangeFn<string>,
  columnFilters: ColumnFiltersState,
  setColumnFilters: OnChangeFn<ColumnFiltersState>,
) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  return useReactTable({
    data,
    columns: brevoContactSyncColumns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: brevoContactSyncGlobalFilterFn,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    initialState: {
      pagination: { pageSize: 20 },
    },
    state: {
      sorting,
      rowSelection,
      globalFilter,
      columnFilters,
    },
  });
}

function BrevoContactSyncSkeletonBody() {
  return (
    <TableBody>
      {BREVO_CONTACT_SYNC_SKELETON_ROW_KEYS.map((rowKey) => (
        <TableRow key={rowKey}>
          {BREVO_CONTACT_SYNC_SKELETON_COL_KEYS.map((colKey) => (
            <TableCell key={`${rowKey}-${colKey}`} className="px-3 py-3">
              <Skeleton className="h-4 w-full max-w-48" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
}

function filterTriggerSummary(selected: string[]): string {
  if (selected.length === 0) return "Alle";
  if (selected.length === 1) return "1 aktiv";
  return `${selected.length} aktiv`;
}

function brevoListTriggerSummary(selectedIds: number[]): string {
  if (selectedIds.length === 0) return "Keine gewählt";
  if (selectedIds.length === 1) return "1 Liste";
  return `${selectedIds.length} Listen`;
}

function useBrevoListsForContactSync() {
  return useQuery({
    queryKey: brevoSyncListsQueryKey,
    queryFn: () => fetchBrevoListsAction(),
    staleTime: 2 * 60 * 1000,
  });
}

type BrevoImportResultSummary = {
  matched: number;
  skippedNoEmail: number;
  submitted: number;
  processId: number;
};

function ImportResultStatTile({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: string;
  tone: "neutral" | "success" | "warning" | "pending";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-500/30 bg-emerald-500/[0.07] text-emerald-950 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-50"
      : tone === "warning"
        ? "border-orange-500/35 bg-orange-500/[0.08] text-orange-950 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-50"
        : tone === "pending"
          ? "border-sky-500/30 bg-sky-500/[0.06] text-sky-950 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-50"
          : "border-border/70 bg-muted/30 text-foreground";

  const iconWrap =
    tone === "success"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : tone === "warning"
        ? "bg-orange-500/15 text-orange-700 dark:text-orange-300"
        : tone === "pending"
          ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
          : "bg-muted text-muted-foreground";

  return (
    <div className={cn("flex flex-col gap-2 rounded-xl border p-4 shadow-sm ring-1 ring-black/5 dark:ring-white/10", toneClass)}>
      <div className="flex items-start gap-3">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", iconWrap)}>
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
          <p className="font-heading text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
          {hint ? <p className="text-xs leading-snug text-muted-foreground">{hint}</p> : null}
        </div>
      </div>
    </div>
  );
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function BrevoContactSyncView() {
  const queryClient = useQueryClient();
  const filters = useBrevoContactSyncFilters();
  const { data = [], isPending, isError, error } = useBrevoContactSyncContacts();
  const {
    data: brevoLists = [],
    isPending: listsPending,
    isError: listsError,
    error: listsErrorObj,
  } = useBrevoListsForContactSync();

  const [selectedBrevoListIds, setSelectedBrevoListIds] = useState<number[]>([]);
  const [createNewListEnabled, setCreateNewListEnabled] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [lastImportSummary, setLastImportSummary] = useState<BrevoImportResultSummary | null>(null);
  const [importResultDialogOpen, setImportResultDialogOpen] = useState(false);

  const table = useBrevoContactSyncTable(
    data,
    filters.globalFilter,
    filters.setGlobalFilter,
    filters.columnFilters,
    filters.setColumnFilters,
  );

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedCount = selectedRows.length;
  const filteredTotal = table.getFilteredRowModel().rows.length;

  const toggleBrevoListId = useCallback((listId: number) => {
    setSelectedBrevoListIds((prev) =>
      prev.includes(listId) ? prev.filter((id) => id !== listId) : [...prev, listId],
    );
  }, []);

  const clearBrevoListSelection = useCallback(() => {
    setSelectedBrevoListIds([]);
  }, []);

  const hasListTargets = selectedBrevoListIds.length > 0;
  const hasNewListTarget = createNewListEnabled && newListName.trim().length > 0;
  const canImport = selectedCount > 0 && (hasListTargets || hasNewListTarget);

  const importMutation = useMutation({
    mutationFn: (payload: { contactIds: string[]; listIds: number[]; newListName?: string }) =>
      importBrevoContactsBulkAction(payload),
    onSuccess: (result, variables) => {
      const summary: BrevoImportResultSummary = {
        matched: variables.contactIds.length,
        skippedNoEmail: result.skippedNoEmail,
        submitted: result.submitted,
        processId: result.processId,
      };
      setLastImportSummary(summary);
      setImportResultDialogOpen(true);

      const toastParts = [
        `${result.submitted} übermittelt`,
        result.skippedNoEmail > 0 ? `${result.skippedNoEmail} ohne E-Mail` : null,
        `Prozess #${result.processId}`,
      ].filter(Boolean);
      toast.success("Import in Brevo gestartet", { description: toastParts.join(" · ") });
      void queryClient.invalidateQueries({ queryKey: brevoSyncListsQueryKey });
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      toast.error("Brevo-Import fehlgeschlagen", { description: message });
    },
  });

  const handleImportClick = useCallback(() => {
    if (!canImport) return;
    const contactIds = selectedRows.map((r) => r.original.id);
    importMutation.mutate({
      contactIds,
      listIds: selectedBrevoListIds,
      newListName: createNewListEnabled ? newListName.trim() : undefined,
    });
  }, [
    canImport,
    createNewListEnabled,
    importMutation,
    newListName,
    selectedBrevoListIds,
    selectedRows,
  ]);

  const handleCopyProcessId = useCallback(async () => {
    if (!lastImportSummary) return;
    const ok = await copyTextToClipboard(String(lastImportSummary.processId));
    if (ok) {
      toast.success("Prozess-ID kopiert");
    } else {
      toast.error("Kopieren fehlgeschlagen", { description: "Zwischenablage nicht verfügbar." });
    }
  }, [lastImportSummary]);

  return (
    <div className="space-y-8">
      <Card className="border-border rounded-xl shadow-sm">
        <CardHeader className="space-y-2 pb-2 sm:pb-4">
          <CardTitle className="text-xl font-semibold tracking-tight">Kontakte für den Import</CardTitle>
          <CardDescription className="max-w-3xl text-base leading-relaxed">
            Suchen und filtern Sie nach Kundentyp und Status. Markierte Zeilen werden beim Import an Brevo übermittelt.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-2 sm:pt-0">
          <div className="flex flex-col gap-4 border-b border-border/60 pb-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="relative w-full max-w-sm flex-1">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    placeholder="Kontakte suchen (Name, E-Mail, Firma …)"
                    value={filters.globalFilter}
                    onChange={(e) => filters.setGlobalFilter(e.target.value)}
                    className="bg-background pl-9"
                    aria-label="Globale Suche"
                  />
                </div>
                {selectedCount > 0 && (
                  <Badge variant="secondary" className="h-8 shrink-0 px-3 text-xs font-medium">
                    {selectedCount} ausgewählt
                  </Badge>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-9 shrink-0 justify-between gap-2 sm:min-w-44",
                        filters.kundentypSelected.length > 0 ? "border-primary/40 bg-primary/5" : "bg-background",
                      )}
                    >
                      <span className="truncate">Kundentyp · {filterTriggerSummary(filters.kundentypSelected)}</span>
                      <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64" onCloseAutoFocus={(e) => e.preventDefault()}>
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                      Mehrfachauswahl
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-xs"
                      onSelect={(e) => {
                        e.preventDefault();
                        filters.clearKundentyp();
                      }}
                    >
                      Filter zurücksetzen
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {kundentypOptions.map((opt) => (
                      <DropdownMenuCheckboxItem
                        key={opt.value}
                        checked={filters.kundentypSelected.includes(opt.value)}
                        onCheckedChange={() => filters.toggleKundentyp(opt.value)}
                        onSelect={(e) => e.preventDefault()}
                      >
                        {opt.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-9 shrink-0 justify-between gap-2 sm:min-w-44",
                        filters.statusSelected.length > 0 ? "border-primary/40 bg-primary/5" : "bg-background",
                      )}
                    >
                      <span className="truncate">Status · {filterTriggerSummary(filters.statusSelected)}</span>
                      <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56" onCloseAutoFocus={(e) => e.preventDefault()}>
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                      Mehrfachauswahl
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-xs"
                      onSelect={(e) => {
                        e.preventDefault();
                        filters.clearStatus();
                      }}
                    >
                      Filter zurücksetzen
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {statusOptions.map((opt) => (
                      <DropdownMenuCheckboxItem
                        key={opt.value}
                        checked={filters.statusSelected.includes(opt.value)}
                        onCheckedChange={() => filters.toggleStatus(opt.value)}
                        onSelect={(e) => e.preventDefault()}
                      >
                        {opt.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex shrink-0 items-center gap-2 border-border/60 lg:border-l lg:pl-6">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Zeilen pro Seite</span>
                <Select
                  value={String(table.getState().pagination.pageSize)}
                  onValueChange={(v) => table.setPageSize(Number(v))}
                >
                  <SelectTrigger size="sm" className="h-9 w-[4.5rem] bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {isError ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error instanceof Error ? error.message : "Kontakte konnten nicht geladen werden."}
            </p>
          ) : null}

          <div className="overflow-x-auto rounded-md border border-border shadow-sm">
            <Table className="[&>thead>tr>th]:text-left">
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="whitespace-nowrap px-3 py-3 text-sm font-medium text-foreground">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              {isPending ? (
                <BrevoContactSyncSkeletonBody />
              ) : (
                <TableBody>
                  {table.getRowModel().rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={BREVO_CONTACT_SYNC_COLUMN_COUNT}
                        className="h-32 text-center text-sm text-muted-foreground"
                      >
                        Keine Kontakte für die aktuellen Filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="px-3 py-3 text-sm">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              )}
            </Table>
          </div>

          <div className="flex flex-col gap-4 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {isPending ? (
                "…"
              ) : (
                <>
                  <span className="font-medium text-foreground">{selectedCount}</span> von{" "}
                  <span className="font-medium text-foreground">{filteredTotal}</span> sichtbaren Zeilen ausgewählt · Seite{" "}
                  {table.getState().pagination.pageIndex + 1} von {Math.max(table.getPageCount(), 1)}
                </>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => table.setPageIndex(0)}
                disabled={isPending || !table.getCanPreviousPage()}
              >
                {"<<"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => table.previousPage()}
                disabled={isPending || !table.getCanPreviousPage()}
              >
                Zurück
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => table.nextPage()}
                disabled={isPending || !table.getCanNextPage()}
              >
                Weiter
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={isPending || !table.getCanNextPage()}
              >
                {">>"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border rounded-xl shadow-sm">
        <CardHeader className="space-y-2 border-b border-border/60 bg-muted/20 px-6 py-6 sm:px-8">
          <CardTitle className="text-xl font-semibold tracking-tight">Import-Einstellungen (Brevo)</CardTitle>
          <CardDescription className="max-w-2xl text-base leading-relaxed">
            Ziel-Listen wählen und optional eine neue Liste anlegen. Es werden nur markierte CRM-Kontakte mit gültiger
            E-Mail-Adresse importiert.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 px-6 py-8 sm:px-8">
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Bestehende Brevo-Listen</Label>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Mehrfachauswahl möglich — Kontakte werden den gewählten Listen zugeordnet.
              </p>
            </div>
            {listsError ? (
              <p className="text-sm text-destructive">
                {listsErrorObj instanceof Error ? listsErrorObj.message : "Listen konnten nicht geladen werden."}
              </p>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "h-10 min-h-10 w-full max-w-lg justify-between gap-2 sm:min-w-[22rem]",
                    selectedBrevoListIds.length > 0 && "border-primary/40 bg-primary/5",
                  )}
                  disabled={listsPending || listsError}
                >
                  <span className="truncate">
                    {listsPending ? "Listen werden geladen…" : `Listen · ${brevoListTriggerSummary(selectedBrevoListIds)}`}
                  </span>
                  {listsPending ? (
                    <Loader2 className="size-4 shrink-0 animate-spin opacity-60" aria-hidden />
                  ) : (
                    <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-(--radix-dropdown-menu-trigger-width) max-h-72 sm:max-w-md"
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Mehrfachauswahl</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-xs"
                  onSelect={(e) => {
                    e.preventDefault();
                    clearBrevoListSelection();
                  }}
                >
                  Auswahl leeren
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {brevoLists.length === 0 && !listsPending ? (
                  <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                    Keine Listen im Brevo-Konto
                  </DropdownMenuItem>
                ) : (
                  brevoLists.map((list) => (
                    <DropdownMenuCheckboxItem
                      key={list.id}
                      checked={selectedBrevoListIds.includes(list.id)}
                      onCheckedChange={() => toggleBrevoListId(list.id)}
                      onSelect={(e) => e.preventDefault()}
                    >
                      <span className="truncate">{list.name}</span>
                      <span className="ml-2 shrink-0 text-xs text-muted-foreground tabular-nums">#{list.id}</span>
                    </DropdownMenuCheckboxItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Separator className="bg-border/60" />

          <fieldset className="space-y-5 rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
            <legend className="mb-0 w-full border-0 p-0 text-left text-sm font-medium leading-none">
              Neue Liste erstellen
            </legend>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <p className="max-w-prose flex-1 text-sm leading-relaxed text-muted-foreground">
                Optional: ergänzend oder anstelle bestehender Listen. Brevo legt die Liste beim Import an und ordnet die
                Kontakte zu.
              </p>
              <Switch
                id="brevo-sync-new-list-toggle"
                checked={createNewListEnabled}
                onCheckedChange={(checked) => {
                  setCreateNewListEnabled(checked);
                  if (!checked) {
                    setNewListName("");
                  }
                }}
                className="shrink-0 sm:mt-0.5"
                aria-label="Neue Brevo-Liste beim Import anlegen"
              />
            </div>
            {createNewListEnabled ? (
              <div className="space-y-2">
                <Label htmlFor="brevo-sync-new-list-name" className="text-sm font-medium">
                  Listenname
                </Label>
                <Input
                  id="brevo-sync-new-list-name"
                  placeholder="z. B. AquaDock CRM — ausgewählte Kontakte"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="max-w-lg bg-background"
                  autoComplete="off"
                />
              </div>
            ) : null}
          </fieldset>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-4 border-t border-border/60 bg-muted/20 px-6 py-8 sm:px-8">
          <Button
            type="button"
            size="lg"
            className="h-12 w-full gap-2 text-base font-semibold shadow-sm sm:w-auto sm:self-end sm:px-10"
            disabled={!canImport || importMutation.isPending}
            onClick={handleImportClick}
          >
            {importMutation.isPending ? (
              <Loader2 className="size-5 animate-spin" aria-hidden />
            ) : (
              <CloudUpload className="size-5" aria-hidden />
            )}
            Auswahl nach Brevo importieren
          </Button>
          <p className="text-center text-sm text-muted-foreground sm:text-right">
            {selectedCount === 0
              ? "Wählen Sie mindestens einen Kontakt in der Tabelle aus."
              : !hasListTargets && !hasNewListTarget
                ? "Wählen Sie mindestens eine Liste oder aktivieren Sie „Neue Liste erstellen“ mit einem Namen."
                : "Der Import läuft asynchron bei Brevo; in der Bestätigung sehen Sie die Prozess-ID."}
          </p>
        </CardFooter>
      </Card>

      {lastImportSummary ? (
        <Card className="rounded-xl border border-emerald-500/25 bg-linear-to-br from-emerald-500/4 to-transparent shadow-sm">
          <CardHeader className="space-y-1 px-6 pb-2 pt-6 sm:px-8 sm:pt-8">
            <div className="flex flex-wrap items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
              <CardTitle className="text-base">Letzter Import</CardTitle>
            </div>
            <CardDescription>
              {lastImportSummary.submitted} Kontakt(e) übermittelt · Prozess #{lastImportSummary.processId}
              {lastImportSummary.skippedNoEmail > 0
                ? ` · ${lastImportSummary.skippedNoEmail} ohne E-Mail übersprungen`
                : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 px-6 pb-6 pt-0 sm:px-8 sm:pb-8">
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setImportResultDialogOpen(true)}>
              Details anzeigen
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-2" asChild>
              <a href={BREVO_APP_CONTACTS_URL} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" aria-hidden />
                Brevo öffnen
              </a>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={importResultDialogOpen} onOpenChange={setImportResultDialogOpen}>
        <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-2xl" showCloseButton>
          <DialogHeader>
            <div className="flex items-center gap-2 pr-8">
              <span className="flex size-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                <Sparkles className="size-5" aria-hidden />
              </span>
              <div>
                <DialogTitle>Import erfolgreich gestartet</DialogTitle>
                <DialogDescription className="mt-1.5 text-pretty">
                  Die Brevo-API hat den Import angenommen. Aufteilung <strong>neu angelegt</strong> vs.{" "}
                  <strong>bereits vorhanden</strong> liefert Brevo erst nach Abschluss des Hintergrund-Jobs — die
                  übermittelte Menge entspricht allen gültigen E-Mails aus Ihrer Auswahl.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {lastImportSummary ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <ImportResultStatTile
                  icon={Users}
                  label="Gematcht (Auswahl)"
                  value={lastImportSummary.matched}
                  hint="Kontakte, die Sie in der Tabelle markiert hatten."
                  tone="neutral"
                />
                <ImportResultStatTile
                  icon={MailWarning}
                  label="Übersprungen (keine E-Mail)"
                  value={lastImportSummary.skippedNoEmail}
                  hint="Ohne nutzbare E-Mail-Adresse — nicht an Brevo gesendet."
                  tone="warning"
                />
                <ImportResultStatTile
                  icon={CheckCircle2}
                  label="Erstellt (übermittelt)"
                  value={lastImportSummary.submitted}
                  hint="Kontakte in der Brevo-Import-Warteschlange — umfasst neue Datensätze und Aktualisierungen, bis der Job fertig ist."
                  tone="success"
                />
                <ImportResultStatTile
                  icon={UserRoundCheck}
                  label="Bereits vorhanden"
                  value="—"
                  hint="Wie viele Kontakte nur aktualisiert wurden, sehen Sie nach Abschluss des Imports in Brevo."
                  tone="pending"
                />
              </div>

              <Separator />

              <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/25 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground shadow-sm ring-1 ring-border/80">
                    <Hash className="size-5" aria-hidden />
                  </span>
                  <div>
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Prozess-ID</p>
                    <p className="font-mono text-lg font-semibold tabular-nums">{lastImportSummary.processId}</p>
                    <p className="text-xs text-muted-foreground">Zum Nachverfolgen in Brevo oder im Support.</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void handleCopyProcessId()}>
                    <ClipboardCopy className="size-4" aria-hidden />
                    ID kopieren
                  </Button>
                  <Button type="button" size="sm" className="gap-2" asChild>
                    <a href={BREVO_APP_CONTACTS_URL} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-4" aria-hidden />
                      Brevo öffnen
                    </a>
                  </Button>
                </div>
              </div>
            </>
          ) : null}

          <DialogFooter className="border-t-0 bg-transparent p-0 sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setImportResultDialogOpen(false)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
