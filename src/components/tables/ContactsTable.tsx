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
import { useState } from "react";
import { toast } from "sonner";

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
import type { Contact } from "@/lib/supabase/database.types";
import { safeDisplay } from "@/lib/utils/data-format";

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
  const [localGlobalFilter, setLocalGlobalFilter] = useState<string>("");
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({ anrede: false });
  const [rowSelection, setRowSelection] = useState({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });

  const globalFilter = propGlobalFilter ?? localGlobalFilter;
  const setGlobalFilter = propOnGlobalFilterChange ?? setLocalGlobalFilter;

  const columns: ColumnDef<ContactWithCompany>[] = [
    columnHelper.display({
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllRowsSelected()}
          onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
    }) as ColumnDef<ContactWithCompany>,
    columnHelper.display({
      id: "name",
      header: "Name",
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
      header: "Primary",
      cell: (info) => (info.getValue() ? <Badge variant="secondary">Primary</Badge> : "—"),
    }) as ColumnDef<ContactWithCompany>,
    columnHelper.accessor("anrede", {
      id: "anrede",
      header: "Anrede",
      cell: (info) => safeDisplay(info.getValue()),
    }) as ColumnDef<ContactWithCompany>,
    columnHelper.display({
      id: "company",
      header: "Firma",
      cell: (info) => {
        const company = info.row.original.companies;
        if (!company) return "—";
        return (
          <Link href={`/companies/${info.row.original.company_id}`} className="text-primary hover:underline">
            {company.firmenname}
          </Link>
        );
      },
    }) as ColumnDef<ContactWithCompany>,
    columnHelper.accessor("email", {
      id: "email",
      header: "Email",
      cell: (info) => safeDisplay(info.getValue()),
    }) as ColumnDef<ContactWithCompany>,
    columnHelper.accessor("telefon", {
      id: "telefon",
      header: "Telefon",
      cell: (info) => safeDisplay(info.getValue()),
    }) as ColumnDef<ContactWithCompany>,
    columnHelper.accessor("mobil", {
      id: "mobil",
      header: "Mobil",
      cell: (info) => safeDisplay(info.getValue()),
    }) as ColumnDef<ContactWithCompany>,
    columnHelper.accessor("durchwahl", {
      id: "durchwahl",
      header: "Durchwahl",
      cell: (info) => safeDisplay(info.getValue()),
    }) as ColumnDef<ContactWithCompany>,
    columnHelper.accessor("notes", {
      id: "notes",
      header: "Notes",
      cell: (info) => safeDisplay(info.getValue()),
    }) as ColumnDef<ContactWithCompany>,
    columnHelper.display({
      id: "actions",
      header: "Actions",
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
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => {
              if (confirm("Are you sure you want to delete this contact?")) {
                try {
                  onDelete?.(info.row.original.id);
                } catch (error) {
                  console.error("Error deleting contact:", error);
                  toast.error("Failed to delete contact");
                }
              }
            }}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      ),
      enableSorting: false,
    }) as ColumnDef<ContactWithCompany>,
  ];

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
    onGlobalFilterChange: setGlobalFilter,
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
      toast.error("Failed to export data");
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
      toast.error("Failed to export data");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Input
            placeholder="Search contacts..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(String(event.target.value))}
            className="max-w-sm"
          />
          {table.getFilteredSelectedRowModel().rows.length > 0 && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {table.getFilteredSelectedRowModel().rows.length} selected
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
                <Link href="/import/csv">Import CSV</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/import/json">Import JSON</Link>
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
              <DropdownMenuItem onClick={handleExportCSV}>Export CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJSON}>Export JSON</DropdownMenuItem>
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
                      {column.id}
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
                        className="flex items-center justify-start gap-2 w-full h-full p-4 text-left font-medium" // ← justify-start added
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
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-muted-foreground text-sm">
          {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s)
          selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
