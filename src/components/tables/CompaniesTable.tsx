// src/components/tables/CompaniesTable.tsx
// Explicit ColumnDef<Company> casts used to satisfy TanStack Table generics
"use client";

import {
  type ColumnDef,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  type Updater,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, Columns, Download, Edit, Eye, Trash, Upload } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT } from "@/lib/i18n/use-translations";
import { cn } from "@/lib/utils";
import { formatDateDistance, safeDisplay } from "@/lib/utils/data-format";
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
}

const columnHelper = createColumnHelper<CompanyWithContacts>();

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
}: CompaniesTableProps) {
  const t = useT("companies");
  const tCommon = useT("common");
  const [localGlobalFilter, setLocalGlobalFilter] = useState<string>("");
  const [columnVisibility, setColumnVisibility] = useState({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<CompanyWithContacts | null>(null);

  const globalFilter = propGlobalFilter ?? localGlobalFilter;
  const setGlobalFilter = propOnGlobalFilterChange ?? setLocalGlobalFilter;

  const handleGlobalFilterChange = useCallback(
    (value: string) => {
      setGlobalFilter(value);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
      onPaginationChange({ pageIndex: 0, pageSize: pagination.pageSize });
    },
    [setGlobalFilter, onPaginationChange, pagination.pageSize],
  );

  const columns = useMemo<ColumnDef<CompanyWithContacts>[]>(
    () => [
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
      }) as ColumnDef<CompanyWithContacts>,
      columnHelper.accessor("firmenname", {
        id: "firmenname",
        header: t("tableColFirmenname"),
        cell: (info) => (
          <Link href={`/companies/${info.row.original.id}`} className="text-primary hover:underline">
            {safeDisplay(info.getValue())}
          </Link>
        ),
      }) as ColumnDef<CompanyWithContacts>,
      columnHelper.accessor("kundentyp", {
        header: t("tableColKundentyp"),
        cell: (info) => <Badge className="bg-primary text-primary-foreground">{safeDisplay(info.getValue())}</Badge>,
      }) as ColumnDef<CompanyWithContacts>,
      columnHelper.accessor("status", {
        header: t("tableColStatus"),
        cell: (info) => {
          const raw = info.getValue();
          const value = typeof raw === "string" ? raw : String(raw ?? "");
          return (
            <Badge
              className={cn(
                value === "won" && "bg-emerald-600 text-white",
                value === "lost" && "bg-rose-600 text-white",
                value === "lead" && "bg-amber-600 text-white",
                !["won", "lost", "lead"].includes(value) && "bg-zinc-500 text-white",
              )}
            >
              {value}
            </Badge>
          );
        },
      }) as ColumnDef<CompanyWithContacts>,
      columnHelper.accessor("contacts", {
        id: "hauptkontakt",
        header: t("tableColHauptkontakt"),
        cell: (info) => {
          const contacts: Contact[] = info.row.original.contacts ?? [];
          const primary = contacts.find((c) => c.is_primary);
          if (!primary) return tCommon("dash");
          return (
            <div className="flex flex-col">
              <Link href={`/contacts/${primary.id}`} className="text-primary hover:underline font-medium">
                {`${primary.vorname} ${primary.nachname}`}
              </Link>
              <span className="text-xs text-muted-foreground">{primary.position || tCommon("dash")}</span>
            </div>
          );
        },
        enableSorting: false,
      }) as ColumnDef<CompanyWithContacts>,
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
      }) as ColumnDef<CompanyWithContacts>,
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
      }) as ColumnDef<CompanyWithContacts>,
      columnHelper.accessor("created_at", {
        id: "created_at",
        header: t("tableColCreated"),
        cell: (info) => {
          const v = info.getValue();
          const d =
            v === null || v === undefined ? v : typeof v === "string" ? v : undefined;
          return formatDateDistance(d);
        },
      }) as ColumnDef<CompanyWithContacts>,
      columnHelper.display({
        id: "actions",
        header: t("tableColActions"),
        cell: (info) => (
          <div className="flex space-x-2">
            <Link href={`/companies/${info.row.original.id}`}>
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
      }) as ColumnDef<CompanyWithContacts>,
    ],
    [onEdit, onDelete, deleteDialogOpen, companyToDelete, t, tCommon],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable<CompanyWithContacts>({
    data: companies,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount,
    getRowId: (row) => row.id,
    initialState: {
      pagination: { pageSize: 20 },
    },
    state: {
      globalFilter,
      columnVisibility,
      rowSelection,
      pagination,
      sorting,
    },
    onGlobalFilterChange: handleGlobalFilterChange,
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
    globalFilterFn: "includesString",
    filterFromLeafRows: true,
  });

  const handleExportCSV = () => {
    try {
      const data = table.getFilteredRowModel().rows.map((row) => row.original);
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
      const data = table.getFilteredRowModel().rows.map((row) => row.original);
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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Input
            key="companies-search-input"
            placeholder={t("tableSearchPlaceholder")}
            value={globalFilter ?? ""}
            onChange={(event) => handleGlobalFilterChange(String(event.target.value))}
            className="max-w-sm"
          />
          {table.getFilteredSelectedRowModel().rows.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {t("tableSelectedCount", { count: table.getFilteredSelectedRowModel().rows.length })}
              </span>
              {selectionActions}
            </div>
          )}
        </div>
        <div className="flex space-x-2">
          <select
            value={pagination.pageSize}
            onChange={(e) => {
              const newSize = Number(e.target.value);
              const newPagination = { ...pagination, pageIndex: 0, pageSize: newSize };
              setPagination(newPagination);
              onPaginationChange(newPagination);
            }}
            className="px-2 py-1 border rounded"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={30}>30</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
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
            {table.getRowModel().rows?.length ? (
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
            selected: table.getFilteredSelectedRowModel().rows.length,
            total: table.getFilteredRowModel().rows.length,
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
