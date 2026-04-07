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
  type TableOptions,
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
  brevoContactSyncGlobalFilterFn,
  buildBrevoContactSyncColumns,
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
import { useT } from "@/lib/i18n/use-translations";
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
  columns: TableOptions<BrevoContactSyncRow>["columns"],
  data: BrevoContactSyncRow[],
  globalFilter: string,
  setGlobalFilter: OnChangeFn<string>,
  columnFilters: ColumnFiltersState,
  setColumnFilters: OnChangeFn<ColumnFiltersState>,
) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const onSortingChange = useCallback<OnChangeFn<SortingState>>((updater) => {
    setSorting(updater);
  }, []);

  const onRowSelectionChange = useCallback<OnChangeFn<RowSelectionState>>((updater) => {
    setRowSelection(updater);
  }, []);

  const onGlobalFilterChange = useCallback<OnChangeFn<string>>(
    (updater) => {
      setGlobalFilter(updater);
    },
    [setGlobalFilter],
  );

  const onColumnFiltersChange = useCallback<OnChangeFn<ColumnFiltersState>>(
    (updater) => {
      setColumnFilters(updater);
    },
    [setColumnFilters],
  );

  const tableOptions = useMemo(
    () => ({
      data,
      columns,
      getRowId: (row: BrevoContactSyncRow) => row.id,
      getCoreRowModel: getCoreRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      getSortedRowModel: getSortedRowModel(),
      globalFilterFn: brevoContactSyncGlobalFilterFn,
      onSortingChange,
      onRowSelectionChange,
      onGlobalFilterChange,
      onColumnFiltersChange,
      initialState: {
        pagination: { pageSize: 20 },
      },
      state: {
        sorting,
        rowSelection,
        globalFilter,
        columnFilters,
      },
    }),
    [
      columns,
      data,
      sorting,
      rowSelection,
      globalFilter,
      columnFilters,
      onSortingChange,
      onRowSelectionChange,
      onGlobalFilterChange,
      onColumnFiltersChange,
    ],
  );

  return useReactTable(tableOptions);
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
  const t = useT("brevo");
  const tCommon = useT("common");
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

  const columnDefs = useMemo(
    () =>
      buildBrevoContactSyncColumns(
        (key, values) => t(key as Parameters<typeof t>[0], values),
        tCommon("dash"),
      ),
    [t, tCommon],
  );

  const filterSummary = useCallback(
    (selected: string[]) => {
      if (selected.length === 0) return t("syncFilterSummaryAll");
      if (selected.length === 1) return t("syncFilterSummaryOne");
      return t("syncFilterSummaryMany", { count: selected.length });
    },
    [t],
  );

  const listSummary = useCallback(
    (selectedIds: number[]) => {
      if (selectedIds.length === 0) return t("syncListSummaryNone");
      if (selectedIds.length === 1) return t("syncListSummaryOne");
      return t("syncListSummaryMany", { count: selectedIds.length });
    },
    [t],
  );

  const table = useBrevoContactSyncTable(
    columnDefs,
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

      toast.success(t("syncToastImportStarted"), {
        description: t("syncToastImportStartedDesc", {
          submitted: result.submitted,
          skipped: result.skippedNoEmail,
          processId: result.processId,
        }),
      });
      void queryClient.invalidateQueries({ queryKey: brevoSyncListsQueryKey });
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : t("unknownError");
      toast.error(t("syncToastImportFailed"), { description: message });
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
      toast.success(t("syncToastProcessIdCopied"));
    } else {
      toast.error(t("syncToastCopyFailed"), { description: t("syncToastCopyFailedDesc") });
    }
  }, [lastImportSummary, t]);

  return (
    <div className="space-y-8">
      <Card className="border-border rounded-xl shadow-sm">
        <CardHeader className="space-y-2 pb-2 sm:pb-4">
          <CardTitle className="text-xl font-semibold tracking-tight">{t("syncContactsCardTitle")}</CardTitle>
          <CardDescription className="max-w-3xl text-base leading-relaxed">{t("syncContactsCardDescription")}</CardDescription>
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
                    placeholder={t("syncSearchPlaceholder")}
                    value={filters.globalFilter}
                    onChange={(e) => filters.setGlobalFilter(e.target.value)}
                    className="bg-background pl-9"
                    aria-label={t("syncSearchAriaLabel")}
                  />
                </div>
                {selectedCount > 0 && (
                  <Badge variant="secondary" className="h-8 shrink-0 px-3 text-xs font-medium">
                    {t("syncSelectedCount", { count: selectedCount })}
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
                      <span className="truncate">
                        {t("syncFilterKundentypChip", { summary: filterSummary(filters.kundentypSelected) })}
                      </span>
                      <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64" onCloseAutoFocus={(e) => e.preventDefault()}>
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                      {t("syncFilterMultiLabel")}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-xs"
                      onSelect={(e) => {
                        e.preventDefault();
                        filters.clearKundentyp();
                      }}
                    >
                      {t("syncFilterReset")}
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
                      <span className="truncate">
                        {t("syncFilterStatusChip", { summary: filterSummary(filters.statusSelected) })}
                      </span>
                      <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56" onCloseAutoFocus={(e) => e.preventDefault()}>
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                      {t("syncFilterMultiLabel")}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-xs"
                      onSelect={(e) => {
                        e.preventDefault();
                        filters.clearStatus();
                      }}
                    >
                      {t("syncFilterReset")}
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
                <span className="text-sm text-muted-foreground whitespace-nowrap">{t("syncRowsPerPage")}</span>
                <Select
                  value={String(table.getState().pagination.pageSize)}
                  onValueChange={(v) => {
                    table.setPageSize(Number(v));
                  }}
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
              {error instanceof Error ? error.message : t("syncLoadContactsError")}
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
                        {t("syncTableEmpty")}
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
                tCommon("ellipsis")
              ) : (
                <>
                  {t("syncFooterSelectedVisible", { selected: selectedCount, visible: filteredTotal })}
                  {" · "}
                  {t("syncFooterPage", {
                    page: table.getState().pagination.pageIndex + 1,
                    pageCount: Math.max(table.getPageCount(), 1),
                  })}
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
                aria-label={t("syncPagerFirst")}
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
                {t("syncPagerPrev")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => table.nextPage()}
                disabled={isPending || !table.getCanNextPage()}
              >
                {t("syncPagerNext")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={isPending || !table.getCanNextPage()}
                aria-label={t("syncPagerLast")}
              >
                {">>"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border rounded-xl shadow-sm">
        <CardHeader className="space-y-2 border-b border-border/60 bg-muted/20 px-6 py-6 sm:px-8">
          <CardTitle className="text-xl font-semibold tracking-tight">{t("syncImportCardTitle")}</CardTitle>
          <CardDescription className="max-w-2xl text-base leading-relaxed">{t("syncImportCardDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 px-6 py-8 sm:px-8">
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">{t("syncListsLabel")}</Label>
              <p className="mt-1.5 text-sm text-muted-foreground">{t("syncListsHelp")}</p>
            </div>
            {listsError ? (
              <p className="text-sm text-destructive">
                {listsErrorObj instanceof Error ? listsErrorObj.message : t("syncListsLoadError")}
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
                    {listsPending
                      ? t("syncListsLoading")
                      : t("syncListsTrigger", { summary: listSummary(selectedBrevoListIds) })}
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
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  {t("syncFilterMultiLabel")}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-xs"
                  onSelect={(e) => {
                    e.preventDefault();
                    clearBrevoListSelection();
                  }}
                >
                  {t("syncClearListSelection")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {brevoLists.length === 0 && !listsPending ? (
                  <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                    {t("syncListsEmpty")}
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
              {t("syncNewListLegend")}
            </legend>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <p className="max-w-prose flex-1 text-sm leading-relaxed text-muted-foreground">{t("syncNewListHelp")}</p>
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
                aria-label={t("syncNewListSwitchAria")}
              />
            </div>
            {createNewListEnabled ? (
              <div className="space-y-2">
                <Label htmlFor="brevo-sync-new-list-name" className="text-sm font-medium">
                  {t("syncNewListNameLabel")}
                </Label>
                <Input
                  id="brevo-sync-new-list-name"
                  placeholder={t("syncNewListPlaceholder")}
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
            {t("syncImportSelectionButton")}
          </Button>
          <p className="text-center text-sm text-muted-foreground sm:text-right">
            {selectedCount === 0
              ? t("syncImportHintNone")
              : !hasListTargets && !hasNewListTarget
                ? t("syncImportHintNoTarget")
                : t("syncImportHintReady")}
          </p>
        </CardFooter>
      </Card>

      {lastImportSummary ? (
        <Card className="rounded-xl border border-emerald-500/25 bg-linear-to-br from-emerald-500/4 to-transparent shadow-sm">
          <CardHeader className="space-y-1 px-6 pb-2 pt-6 sm:px-8 sm:pt-8">
            <div className="flex flex-wrap items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
              <CardTitle className="text-base">{t("syncLastImportTitle")}</CardTitle>
            </div>
            <CardDescription>
              {t("syncLastImportDesc", {
                submitted: lastImportSummary.submitted,
                processId: lastImportSummary.processId,
                skippedPart:
                  lastImportSummary.skippedNoEmail > 0
                    ? t("syncLastImportSkippedPart", { count: lastImportSummary.skippedNoEmail })
                    : "",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 px-6 pb-6 pt-0 sm:px-8 sm:pb-8">
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setImportResultDialogOpen(true)}>
              {t("syncShowDetails")}
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-2" asChild>
              <a href={BREVO_APP_CONTACTS_URL} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" aria-hidden />
                {t("syncOpenBrevo")}
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
                <DialogTitle>{t("syncResultDialogTitle")}</DialogTitle>
                <DialogDescription className="mt-1.5 text-pretty">{t("syncResultDialogDescription")}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {lastImportSummary ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <ImportResultStatTile
                  icon={Users}
                  label={t("syncStatMatchedLabel")}
                  value={lastImportSummary.matched}
                  hint={t("syncStatMatchedHint")}
                  tone="neutral"
                />
                <ImportResultStatTile
                  icon={MailWarning}
                  label={t("syncStatSkippedLabel")}
                  value={lastImportSummary.skippedNoEmail}
                  hint={t("syncStatSkippedHint")}
                  tone="warning"
                />
                <ImportResultStatTile
                  icon={CheckCircle2}
                  label={t("syncStatSubmittedLabel")}
                  value={lastImportSummary.submitted}
                  hint={t("syncStatSubmittedHint")}
                  tone="success"
                />
                <ImportResultStatTile
                  icon={UserRoundCheck}
                  label={t("syncStatExistingLabel")}
                  value={tCommon("dash")}
                  hint={t("syncStatExistingHint")}
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
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("syncProcessIdLabel")}</p>
                    <p className="font-mono text-lg font-semibold tabular-nums">{lastImportSummary.processId}</p>
                    <p className="text-xs text-muted-foreground">{t("syncProcessIdHelp")}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void handleCopyProcessId()}>
                    <ClipboardCopy className="size-4" aria-hidden />
                    {t("syncCopyId")}
                  </Button>
                  <Button type="button" size="sm" className="gap-2" asChild>
                    <a href={BREVO_APP_CONTACTS_URL} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-4" aria-hidden />
                      {t("syncOpenBrevo")}
                    </a>
                  </Button>
                </div>
              </div>
            </>
          ) : null}

          <DialogFooter className="border-t-0 bg-transparent p-0 sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setImportResultDialogOpen(false)}>
              {t("syncClose")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
