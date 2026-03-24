"use client";

import { useState } from "react";

import Link from "next/link";

import {
  type ColumnDef,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Columns, Download, Edit, Eye, Trash, Upload } from "lucide-react";
import Papa from "papaparse";
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
import type { Contact } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

interface ContactsTableProps {
  contacts: Contact[];
  onEdit?: (contact: Contact) => void;
  onDelete?: (id: string) => void;
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
}

const columnHelper = createColumnHelper<Contact>();

export default function ContactsTable({
  contacts,
  onEdit,
  onDelete,
  globalFilter: propGlobalFilter,
  onGlobalFilterChange: propOnGlobalFilterChange,
}: ContactsTableProps) {
  const [localGlobalFilter, setLocalGlobalFilter] = useState<string>("");
  const [columnVisibility, setColumnVisibility] = useState({ anrede: false });
  const [rowSelection, setRowSelection] = useState({});

  const globalFilter = propGlobalFilter ?? localGlobalFilter;
  const setGlobalFilter = propOnGlobalFilterChange ?? setLocalGlobalFilter;

  const columns: ColumnDef<Contact>[] = [
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
    }),
    columnHelper.accessor("vorname", {
      id: "vorname",
      header: "Vorname",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("nachname", {
      id: "nachname",
      header: "Nachname",
      cell: (info) => (
        <Link href={`/contacts/${info.row.original.id}`} className="text-primary hover:underline">
          {info.getValue()}
        </Link>
      ),
    }),
    columnHelper.accessor("is_primary", {
      id: "is_primary",
      header: "Primary",
      cell: (info) => (info.getValue() ? <Badge variant="secondary">Primary</Badge> : "—"),
    }),
    columnHelper.accessor("anrede", {
      id: "anrede",
      header: "Anrede",
      cell: (info) => info.getValue() || "—",
    }),
    columnHelper.accessor("position", {
      id: "position",
      header: "Position",
      cell: (info) => info.getValue() || "—",
    }),
    columnHelper.accessor("companies.firmenname", {
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
    }),
    columnHelper.accessor("email", {
      id: "email",
      header: "Email",
      cell: (info) => info.getValue() || "—",
    }),
    columnHelper.accessor("telefon", {
      id: "telefon",
      header: "Telefon",
      cell: (info) => info.getValue() || "—",
    }),
    columnHelper.accessor("mobil", {
      id: "mobil",
      header: "Mobil",
      cell: (info) => info.getValue() || "—",
    }),
    columnHelper.accessor("durchwahl", {
      id: "durchwahl",
      header: "Durchwahl",
      cell: (info) => info.getValue() || "—",
    }),
    columnHelper.accessor("notes", {
      id: "notes",
      header: "Notes",
      cell: (info) => info.getValue() || "—",
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (info) => (
        <div className="flex space-x-2">
          <Link href={`/contacts/${info.row.original.id}`}>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => onEdit?.(info.row.original)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
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
    }),
  ];

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable<Contact>({
    data: contacts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
    initialState: { pagination: { pageSize: 20 } },
    state: {
      globalFilter,
      columnVisibility,
      rowSelection,
    },
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
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
      const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
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
              <Button variant="outline" size="icon">
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
              <Button variant="outline" size="icon">
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
              <Button variant="outline" size="icon">
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
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : (
                      <div
                        className={cn(
                          "flex items-center space-x-2 select-none",
                          header.column.getCanSort() && "cursor-pointer hover:bg-muted/50",
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === "asc" && <ArrowUp className="h-4 w-4" />}
                        {header.column.getIsSorted() === "desc" && <ArrowDown className="h-4 w-4" />}
                        {header.column.getIsSorted() === false && header.column.getCanSort() && (
                          <ArrowUpDown className="h-4 w-4" />
                        )}
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
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
