// src/components/tables/CompaniesTable.tsx
// TanStack Table: `columnHelper.accessor` infers per-column TValue; a single array cast matches docs/react-table-v8-ts-tricks.md Pattern B when `satisfies` conflicts with generics.
"use client";

import {
  type ColumnDef,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  type OnChangeFn,
  type Updater,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  Columns,
  Download,
  Edit,
  Eye,
  Loader2,
  Sparkles,
  Trash,
  Upload,
} from "lucide-react";
import Link from "next/link";
import Papa from "papaparse";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
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
import { ContactAvatar } from "@/components/ui/contact-avatar";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyDash } from "@/components/ui/empty-dash";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { WassertypBadge } from "@/components/ui/wassertyp-badge";
import type { CompaniesGlobalSearchStrategy } from "@/lib/companies/companies-list-supabase";
import { kategorieIcons } from "@/lib/constants/company-icons";
import { kundentypOptions } from "@/lib/constants/company-options";
import { useNumberLocaleTag, useT } from "@/lib/i18n/use-translations";
import { cn } from "@/lib/utils";
import { formatDateDistance, safeDisplay } from "@/lib/utils/data-format";

const KUNDENTYP_LABEL_MAP: Record<string, string> = Object.fromEntries(
  kundentypOptions.map((o) => [o.value, o.label]),
);

import type { Company, Contact } from "@/types/database.types";

type CompanyWithContacts = Company & { contacts?: Contact[] };

interface CompaniesTableProps {
  companies: CompanyWithContacts[];
  onEdit?: (company: CompanyWithContacts) => void;
  onDelete?: (companyOrId: string | CompanyWithContacts) => void;
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
  pageCount: number;
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void;
  sorting: { id: string; desc: boolean }[];
  onSortingChange: (sorting: { id: string; desc: boolean }[]) => void;
  onImportCSV?: () => void;
  rowSelection: Record<string, boolean>;
  onRowSelectionChange: (updater: Updater<Record<string, boolean>>) => void;
  /** Shown inline after the “N selected” label when at least one row is selected */
  selectionActions?: ReactNode;
  /** Optional controlled VisibilityState for persisted column toggles */
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
  /** List-only query string (no `?`) to preserve /companies filters when opening detail/contact links */
  companiesListSearchParams?: string;
  /** True while the first page of results is being fetched (no data yet). */
  isInitialLoading?: boolean;
  /** True whenever a search/fetch is in flight (including background refetches). */
  isFetching?: boolean;
  /** Controls visibility of the semantic Sparkles badge in the search input. */
  showSemanticBadge?: boolean;
  /** Last server-applied search strategy for the debounced query (hybrid vs keyword). */
  globalSearchStrategy?: CompaniesGlobalSearchStrategy;
  /** When true and strategy is set, show the subtle mode hint beside the search field. */
  showSearchModeIndicator?: boolean;
}

const columnHelper = createColumnHelper<CompanyWithContacts>();

const SKELETON_ROW_KEYS = [
  "skeleton-a",
  "skeleton-b",
  "skeleton-c",
  "skeleton-d",
  "skeleton-e",
  "skeleton-f",
  "skeleton-g",
  "skeleton-h",
] as const;

export default function CompaniesTable({
  companies,
  onEdit,
  onDelete,
  globalFilter: propGlobalFilter,
  onGlobalFilterChange: propOnGlobalFilterChange,
  pageCount,
  onPaginationChange,
  sorting,
  onSortingChange,
  onImportCSV,
  rowSelection,
  onRowSelectionChange,
  selectionActions,
  columnVisibility: propColumnVisibility,
  onColumnVisibilityChange: propOnColumnVisibilityChange,
  isInitialLoading = false,
  isFetching = false,
  showSemanticBadge = true,
  globalSearchStrategy = "none",
  showSearchModeIndicator = false,
  companiesListSearchParams = "",
}: CompaniesTableProps) {
  const t = useT("companies");
  const localeTag = useNumberLocaleTag();
  const [localGlobalFilter, setLocalGlobalFilter] = useState<string>("");
  const [localColumnVisibility, setLocalColumnVisibility] = useState<VisibilityState>({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<CompanyWithContacts | null>(null);

  const listQs = companiesListSearchParams.length > 0 ? `?${companiesListSearchParams}` : "";

  const globalFilter = propGlobalFilter ?? localGlobalFilter;
  const setGlobalFilter = propOnGlobalFilterChange ?? setLocalGlobalFilter;
  const columnVisibility = propColumnVisibility ?? localColumnVisibility;
  const setColumnVisibility = propOnColumnVisibilityChange ?? setLocalColumnVisibility;

  const handleGlobalFilterChange = useCallback(
    (value: string) => {
      setGlobalFilter(value);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
      onPaginationChange({ pageIndex: 0, pageSize: pagination.pageSize });
    },
    [setGlobalFilter, onPaginationChange, pagination.pageSize],
  );

  const columns = useMemo(
    () =>
      [
        columnHelper.display({
          id: "select",
          header: ({ table }) => (
            <Checkbox
              checked={table.getIsAllRowsSelected()}
              onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
              aria-label={t("tableSelectAllAria")}
            />
          ),
          cell: ({ row }) => (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label={t("tableSelectRowAria")}
            />
          ),
          enableSorting: false,
        }),
        columnHelper.accessor("firmenname", {
          id: "firmenname",
          header: t("tableColFirmenname"),
          cell: (info) => (
            <Link href={`/companies/${info.row.original.id}${listQs}`} className="text-primary hover:underline">
              {safeDisplay(info.getValue())}
            </Link>
          ),
        }),
        columnHelper.accessor("kundentyp", {
          header: t("tableColKundentyp"),
          cell: (info) => {
            const raw = info.getValue();
            if (!raw) return <EmptyDash />;
            const key = String(raw).toLowerCase();
            const Icon = kategorieIcons[key];
            const label = KUNDENTYP_LABEL_MAP[key] ?? String(raw);
            return (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-muted-foreground">
                {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                {label}
              </span>
            );
          },
        }),
        columnHelper.accessor("status", {
          header: t("tableColStatus"),
          cell: (info) => {
            const raw = info.getValue();
            const asString = raw === null || raw === undefined ? "" : typeof raw === "string" ? raw : String(raw);
            return <StatusBadge status={asString} />;
          },
        }),
        columnHelper.accessor("contacts", {
          id: "hauptkontakt",
          header: t("tableColHauptkontakt"),
          cell: (info) => {
            const contacts: Contact[] = info.row.original.contacts ?? [];
            const primary = contacts.find((c) => c.is_primary);
            if (!primary) return <EmptyDash />;
            return (
              <div className="flex items-center gap-2.5">
                <ContactAvatar vorname={primary.vorname} nachname={primary.nachname} />
                <div className="flex flex-col min-w-0">
                  <Link
                    href={`/contacts/${primary.id}${listQs}`}
                    className="truncate text-primary hover:underline font-medium"
                  >
                    {`${primary.vorname} ${primary.nachname}`}
                  </Link>
                  <span className="truncate text-xs text-muted-foreground">
                    {primary.position || <EmptyDash />}
                  </span>
                </div>
              </div>
            );
          },
          enableSorting: false,
        }),
        columnHelper.accessor("contacts", {
          id: "kontaktanzahl",
          header: t("tableColKontaktanzahl"),
          cell: (info) => {
            const contacts: Contact[] = info.row.original.contacts ?? [];
            const count = contacts.length;
            if (count === 0) return <Badge variant="outline">{t("tableContactsNone")}</Badge>;
            const hasPrimary = contacts.some((c) => c.is_primary);
            return (
              <Badge variant={hasPrimary ? "default" : "secondary"}>
                {count} {hasPrimary ? t("tableContactsPrimary") : ""}
              </Badge>
            );
          },
          enableSorting: false,
        }),
        columnHelper.accessor("stadt", {
          id: "adresse",
          header: t("tableColAdresse"),
          cell: (info) => {
            const row = info.row.original;
            const strasse = row.strasse || "";
            const plz = row.plz ? `${row.plz} ` : "";
            const stadt = row.stadt || "";
            const land = row.land || "";
            return (
              <div className="flex flex-col">
                <span>{safeDisplay(`${strasse} ${plz}${stadt}`.trim())}</span>
                {land && <span className="text-xs text-muted-foreground">{land}</span>}
              </div>
            );
          },
        }),
        columnHelper.accessor("wasserdistanz", {
          id: "wasserdistanz",
          header: () => <span className="block text-right">{t("tableColWasserdistanz")}</span>,
          cell: (info) => {
            const value = info.getValue();
            if (value === null || value === undefined) {
              return <div className="text-right"><EmptyDash /></div>;
            }
            const num = Number(value);
            if (num === 0) {
              return (
                <div className="text-right whitespace-nowrap font-medium text-emerald-600 dark:text-emerald-400">
                  {t("waterAtWater")}
                </div>
              );
            }
            const formatted = new Intl.NumberFormat(localeTag).format(num);
            return (
              <div className="text-right tabular-nums whitespace-nowrap">
                {formatted} <span className="text-muted-foreground">m</span>
              </div>
            );
          },
        }),
        columnHelper.accessor("wassertyp", {
          id: "wassertyp",
          header: t("tableColWassertyp"),
          cell: (info) => {
            const value = info.getValue();
            if (!value) return <EmptyDash />;
            return <WassertypBadge wassertyp={String(value)} />;
          },
        }),
        columnHelper.accessor("created_at", {
          id: "created_at",
          header: t("tableColCreated"),
          cell: (info) => {
            const v = info.getValue();
            const d =
              v === null || v === undefined ? v : typeof v === "string" ? v : undefined;
            return formatDateDistance(d);
          },
        }),
        columnHelper.display({
          id: "actions",
          header: t("tableColActions"),
          cell: (info) => (
            <div className="flex space-x-2">
              <Link href={`/companies/${info.row.original.id}${listQs}`}>
                <Button variant="ghost" size="sm" type="button">
                  <Eye className="h-4 w-4" />
                </Button>
              </Link>
              <Button variant="ghost" size="sm" type="button" onClick={() => onEdit?.(info.row.original)}>
                <Edit className="h-4 w-4" />
              </Button>
              <AlertDialog open={deleteDialogOpen && companyToDelete?.id === info.row.original.id} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => {
                      setCompanyToDelete(info.row.original);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("tableDeleteConfirmTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>{t("tableDeleteConfirmDescription")}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        if (companyToDelete) {
                          try {
                            onDelete?.(companyToDelete);
                          } catch (error) {
                            console.error("Error deleting company:", error);
                            toast.error(t("tableToastDeleteFailed"));
                          }
                        }
                        setDeleteDialogOpen(false);
                        setCompanyToDelete(null);
                      }}
                    >
                      {t("delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ),
          enableSorting: false,
        }),
      ] as ColumnDef<CompanyWithContacts>[],
    [onEdit, onDelete, deleteDialogOpen, companyToDelete, t, localeTag, listQs],
  );

  // Server is the authority for filtering (hybrid semantic + lexical search in the
  // `/api/companies/search` Route Handler). We intentionally do NOT register a
  // `getFilteredRowModel` or `globalFilterFn`: re-filtering the server result set
  // with `includesString` would drop every semantic match that doesn't also
  // contain the raw query substring. `manualFiltering` keeps the table honest.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable<CompanyWithContacts>({
    data: companies,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount,
    getRowId: (row) => row.id,
    initialState: {
      pagination: { pageSize: 20 },
    },
    state: {
      columnVisibility,
      rowSelection,
      pagination,
      sorting,
    },
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: onRowSelectionChange,
    onPaginationChange: (updater) => {
      const newPagination = typeof updater === "function" ? updater(pagination) : updater;
      setPagination(newPagination);
      onPaginationChange(newPagination);
    },
    onSortingChange: (updater) => {
      const newSorting = typeof updater === "function" ? updater(sorting) : updater;
      onSortingChange(newSorting);
    },
    enableRowSelection: true,
  });

  const searchModeTooltip =
    globalSearchStrategy === "hybrid"
      ? t("tableSearchModeTooltipHybrid")
      : globalSearchStrategy === "keyword_semantic_disabled"
        ? t("tableSearchModeTooltipKeywordDisabled")
        : globalSearchStrategy === "keyword_fallback"
          ? t("tableSearchModeTooltipKeywordFallback")
          : "";
  const showModeChip =
    showSearchModeIndicator &&
    globalSearchStrategy !== "none" &&
    (globalSearchStrategy === "hybrid" ||
      globalSearchStrategy === "keyword_semantic_disabled" ||
      globalSearchStrategy === "keyword_fallback");

  const handleExportCSV = () => {
    try {
      const data = table.getRowModel().rows.map((row) => row.original);
      const csv = Papa.unparse(data);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `companies-export-${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error(t("tableToastExportFailed"));
    }
  };

  const handleExportJSON = () => {
    try {
      const data = table.getRowModel().rows.map((row) => row.original);
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], {
        type: "application/json;charset=utf-8;",
      });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `companies-export-${new Date().toISOString().split("T")[0]}.json`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error(t("tableToastExportFailed"));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <TooltipProvider delayDuration={250}>
            <div className="flex w-full min-w-0 items-center gap-2.5 sm:max-w-lg md:max-w-xl lg:max-w-2xl">
              <div className="group relative min-w-0 flex-1">
                {showSemanticBadge ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={t("tableSemanticSearchAria")}
                        className="absolute inset-y-0 left-0 z-10 flex w-10 cursor-help items-center justify-center transition-colors"
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary shadow-sm">
                          {isFetching ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          ) : (
                            <Sparkles className="h-4 w-4" aria-hidden />
                          )}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={8} className="max-w-[260px] text-center text-xs leading-relaxed">
                      {t("tableSemanticSearchTooltip")}
                    </TooltipContent>
                  </Tooltip>
                ) : null}
                <Input
                  key="companies-search-input"
                  type="search"
                  spellCheck={false}
                  autoComplete="off"
                  placeholder={t("tableSearchPlaceholder")}
                  value={globalFilter ?? ""}
                  onChange={(event) => handleGlobalFilterChange(String(event.target.value))}
                  aria-label={t("tableSearchPlaceholder")}
                  className={`h-10 w-full appearance-none rounded-lg border-border/70 bg-background/80 pr-3 text-sm shadow-xs transition-colors placeholder:text-muted-foreground/60 hover:border-border focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/15 [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none ${
                    showSemanticBadge ? "pl-10" : "pl-3"
                  }`}
                />
              </div>
              {showModeChip && searchModeTooltip.length > 0 ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={searchModeTooltip}
                      className={cn(
                        "hidden shrink-0 cursor-help items-center gap-1 rounded-md border-0 bg-transparent px-1 py-0.5 text-left shadow-none outline-none sm:inline-flex",
                        "focus-visible:ring-2 focus-visible:ring-ring/35",
                      )}
                    >
                      <span
                        className={cn(
                          "h-1 w-1 shrink-0 rounded-full",
                          globalSearchStrategy === "hybrid" ? "bg-primary/40" : "bg-muted-foreground/25",
                        )}
                        aria-hidden
                      />
                      <span className="font-medium text-[0.65rem] text-muted-foreground/45 uppercase leading-none tracking-[0.2em]">
                        {globalSearchStrategy === "hybrid"
                          ? t("tableSearchModeAbbrHybrid")
                          : t("tableSearchModeAbbrKeyword")}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="end" sideOffset={6} className="max-w-[min(18rem,calc(100vw-2rem))] text-xs leading-relaxed">
                    {searchModeTooltip}
                  </TooltipContent>
                </Tooltip>
              ) : null}
            </div>
          </TooltipProvider>
          {table.getSelectedRowModel().rows.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {t("tableSelectedCount", { count: table.getSelectedRowModel().rows.length })}
              </span>
              {selectionActions}
            </div>
          )}
        </div>
        <div className="flex space-x-2">
          <Select
            value={String(pagination.pageSize)}
            onValueChange={(v) => {
              const newSize = Number(v);
              const newPagination = { ...pagination, pageIndex: 0, pageSize: newSize };
              setPagination(newPagination);
              onPaginationChange(newPagination);
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 30, 50, 100].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" type="button">
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={onImportCSV}>{t("tableImportCsv")}</DropdownMenuItem>
              <DropdownMenuItem disabled>{t("tableJsonComingSoon")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" type="button">
                <Upload className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleExportCSV}>{t("tableExportCsv")}</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJSON}>{t("tableExportJson")}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" type="button">
                <Columns className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  const id = column.id;
                  const label =
                    id === "select"
                      ? t("tableColSelect")
                      : id === "firmenname"
                        ? t("tableColFirmenname")
                        : id === "kundentyp"
                          ? t("tableColKundentyp")
                          : id === "status"
                            ? t("tableColStatus")
                            : id === "hauptkontakt"
                              ? t("tableColHauptkontakt")
                              : id === "kontaktanzahl"
                                ? t("tableColKontaktanzahl")
                                : id === "adresse"
                                  ? t("tableColAdresse")
                                  : id === "wasserdistanz"
                                    ? t("tableColWasserdistanz")
                                    : id === "wassertyp"
                                      ? t("tableColWassertyp")
                                      : id === "created_at"
                                        ? t("tableColCreated")
                                        : id === "actions"
                                          ? t("tableColActions")
                                          : id;
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {label}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="overflow-x-auto rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        type="button"
                        className="flex items-center gap-2 w-full h-full p-4 text-left font-medium cursor-pointer hover:bg-muted/50"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === "asc" && <ArrowUp className="h-4 w-4" />}
                        {header.column.getIsSorted() === "desc" && <ArrowDown className="h-4 w-4" />}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 w-full h-full p-4 text-left font-medium">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isInitialLoading ? (
              SKELETON_ROW_KEYS.map((rowKey) => (
                <TableRow key={rowKey} className="animate-pulse">
                  {table.getVisibleLeafColumns().map((col) => (
                    <TableCell key={`${rowKey}-${col.id}`}>
                      <div className="h-4 w-full max-w-[160px] rounded bg-muted/60" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {t("tableEmpty")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-muted-foreground text-sm">
          {t("tableRowsSelectedSummary", {
            selected: table.getSelectedRowModel().rows.length,
            total: table.getRowModel().rows.length,
          })}
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            {t("tablePrevious")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            {t("tableNext")}
          </Button>
        </div>
      </div>
    </div>
  );
}
