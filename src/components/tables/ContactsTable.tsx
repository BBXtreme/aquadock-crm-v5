// src/components/tables/ContactsTable.tsx
// This file contains the ContactsTable component, which displays a table of contacts with sorting, filtering, and pagination.
"use client";

import {
  type ColumnDef,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, Columns, Download, Edit, Eye, Trash, Upload } from "lucide-react";
import Link from "next/link";
import Papa from "papaparse";
import { useCallback, useMemo, useState } from "react";
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
import { safeDisplay } from "@/lib/utils/data-format";
import type { Contact } from "@/types/database.types";

type ContactWithCompany = Contact & { companies?: { firmenname: string } | null };

interface ContactsTableProps {
  contacts: ContactWithCompany[];
  onEdit?: (contact: ContactWithCompany) => void;
  onDelete?: (id: string) => void;
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
  pageCount: number;
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void;
  sorting: { id: string; desc: boolean }[];
  onSortingChange: (sorting: { id: string; desc: boolean }[]) => void;
}

const columnHelper = createColumnHelper<ContactWithCompany>();

export default function ContactsTable({
  contacts,
  onEdit,
  onDelete,
  globalFilter: propGlobalFilter,
  onGlobalFilterChange: propOnGlobalFilterChange,
  pageCount,
  onPaginationChange,
  sorting,
  onSortingChange,
}: ContactsTableProps) {
  const t = useT("contacts");
  const tCommon = useT("common");
  const [localGlobalFilter, setLocalGlobalFilter] = useState<string>("");
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({ anrede: false });
  const [rowSelection, setRowSelection] = useState({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<ContactWithCompany | null>(null);

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

  const columns = useMemo<ColumnDef<ContactWithCompany>[]>(
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
      }) as ColumnDef<ContactWithCompany>,
      columnHelper.display({
        id: "name",
        header: t("tableColName"),
        cell: (info) => {
          const vorname = info.row.original.vorname;
          const nachname = info.row.original.nachname;
          const position = info.row.original.position;
          return (
            <div>
              <Link href={`/contacts/${info.row.original.id}`} className="text-primary hover:underline">
                <div>
                  {vorname} {nachname}
                </div>
              </Link>
              {position && <div className="text-xs text-gray-500">{position}</div>}
            </div>
          );
        },
      }) as ColumnDef<ContactWithCompany>,
      columnHelper.accessor("is_primary", {
        id: "is_primary",
        header: t("tableColPrimary"),
        cell: (info) =>
          info.getValue() ? <Badge variant="secondary">{t("tablePrimaryBadge")}</Badge> : tCommon("dash"),
      }) as ColumnDef<ContactWithCompany>,
      columnHelper.accessor("anrede", {
        id: "anrede",
        header: t("tableColSalutation"),
        cell: (info) => safeDisplay(info.getValue()),
      }) as ColumnDef<ContactWithCompany>,
      columnHelper.display({
        id: "company",
        header: t("tableColCompany"),
        cell: (info) => {
          const company = info.row.original.companies;
          if (!company) return tCommon("dash");
          return (
            <Link href={`/companies/${info.row.original.company_id}`} className="text-primary hover:underline">
              {company.firmenname}
            </Link>
          );
        },
      }) as ColumnDef<ContactWithCompany>,
      columnHelper.accessor("email", {
        id: "email",
        header: t("tableColEmail"),
        cell: (info) => safeDisplay(info.getValue()),
      }) as ColumnDef<ContactWithCompany>,
      columnHelper.accessor("telefon", {
        id: "telefon",
        header: t("tableColPhone"),
        cell: (info) => safeDisplay(info.getValue()),
      }) as ColumnDef<ContactWithCompany>,
      columnHelper.accessor("mobil", {
        id: "mobil",
        header: t("tableColMobile"),
        cell: (info) => safeDisplay(info.getValue()),
      }) as ColumnDef<ContactWithCompany>,
      columnHelper.accessor("durchwahl", {
        id: "durchwahl",
        header: t("tableColExtension"),
        cell: (info) => safeDisplay(info.getValue()),
      }) as ColumnDef<ContactWithCompany>,
      columnHelper.accessor("notes", {
        id: "notes",
        header: t("tableColNotes"),
        cell: (info) => safeDisplay(info.getValue()),
      }) as ColumnDef<ContactWithCompany>,
      columnHelper.display({
        id: "actions",
        header: t("tableColActions"),
        cell: (info) => (
          <div className="flex space-x-2">
            <Link href={`/contacts/${info.row.original.id}`}>
              <Button variant="ghost" size="sm" type="button">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="sm" type="button" onClick={() => onEdit?.(info.row.original)}>
              <Edit className="h-4 w-4" />
            </Button>
            <AlertDialog open={deleteDialogOpen && contactToDelete?.id === info.row.original.id} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setContactToDelete(info.row.original);
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
                      if (contactToDelete) {
                        try {
                          onDelete?.(contactToDelete.id);
                        } catch (error) {
                          console.error("Error deleting contact:", error);
                          toast.error(t("tableToastDeleteFailed"));
                        }
                      }
                      setDeleteDialogOpen(false);
                      setContactToDelete(null);
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
      }) as ColumnDef<ContactWithCompany>,
    ],
    [t, tCommon, onEdit, onDelete, deleteDialogOpen, contactToDelete],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable<ContactWithCompany>({
    data: contacts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount,
    getRowId: (row) => row.id,
    initialState: { pagination: { pageSize: 20 } },
    state: {
      globalFilter,
      columnVisibility,
      rowSelection,
      pagination,
      sorting,
    },
    onGlobalFilterChange: handleGlobalFilterChange,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
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
      link.setAttribute("download", `contacts-export-${new Date().toISOString().split("T")[0]}.csv`);
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
      link.setAttribute("download", `contacts-export-${new Date().toISOString().split("T")[0]}.json`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error(t("tableToastExportFailed"));
    }
  };

  const columnMenuLabel = useCallback(
    (id: string) => {
      if (id === "select") return t("tableColSelect");
      if (id === "name") return t("tableColName");
      if (id === "is_primary") return t("tableColPrimary");
      if (id === "anrede") return t("tableColSalutation");
      if (id === "company") return t("tableColCompany");
      if (id === "email") return t("tableColEmail");
      if (id === "telefon") return t("tableColPhone");
      if (id === "mobil") return t("tableColMobile");
      if (id === "durchwahl") return t("tableColExtension");
      if (id === "notes") return t("tableColNotes");
      if (id === "actions") return t("tableColActions");
      return id;
    },
    [t],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Input
            placeholder={t("tableSearchPlaceholder")}
            value={globalFilter ?? ""}
            onChange={(event) => handleGlobalFilterChange(String(event.target.value))}
            className="max-w-sm"
          />
          {table.getFilteredSelectedRowModel().rows.length > 0 && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {t("tableSelectedCount", { count: table.getFilteredSelectedRowModel().rows.length })}
            </span>
          )}
        </div>
        <div className="flex space-x-2">
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            className="px-2 py-1 border rounded"
          >
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
              <DropdownMenuItem asChild>
                <Link href="/import/csv">{t("tableImportCsv")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/import/json">{t("tableImportJson")}</Link>
              </DropdownMenuItem>
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
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {columnMenuLabel(column.id)}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="overflow-x-auto rounded-md border shadow-sm">
        <Table className="[&>thead>tr>th]:!text-left">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-left">
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        type="button"
                        className="flex items-center justify-start gap-2 w-full h-full p-4 text-left font-medium"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === "asc" && <ArrowUp className="h-4 w-4" />}
                        {header.column.getIsSorted() === "desc" && <ArrowDown className="h-4 w-4" />}
                      </button>
                    ) : (
                      <div className="flex items-center justify-start! gap-2 w-full h-full p-4 text-left font-medium">
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
