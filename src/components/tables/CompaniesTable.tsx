// Explicit ColumnDef<Company> casts used to satisfy TanStack Table generics
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
import { Download, Edit, Eye, Trash } from "lucide-react";
import Papa from "papaparse";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Company } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDateDistance, safeDisplay } from "@/lib/utils/data-format";

interface CompaniesTableProps {
  companies: Company[];
  onDelete?: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
}

const columnHelper = createColumnHelper<Company>();

const columns = [
  columnHelper.display({
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
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
  }),
  columnHelper.accessor("firmenname", {
    id: "firmenname",
    header: "Firmenname",
    cell: (info) => safeDisplay(info.getValue()),
  }),
  columnHelper.accessor("kundentyp", {
    header: "Kundentyp",
    cell: (info) => (
      <Badge variant="outline" className="bg-[#24BACC] text-white">
        {safeDisplay(info.getValue())}
      </Badge>
    ),
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: (info) => {
      const value = info.getValue() ?? "—";
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
  }),
  columnHelper.accessor("value", {
    header: "Value",
    cell: (info) => formatCurrency(info.getValue()),
  }),
  columnHelper.accessor("stadt", {
    header: "Stadt",
    cell: (info) => safeDisplay(info.getValue()),
  }),
  columnHelper.accessor("land", {
    header: "Land",
    cell: (info) => safeDisplay(info.getValue()),
  }),
  columnHelper.accessor("created_at", {
    header: "Created",
    cell: (info) => formatDateDistance(info.getValue()),
  }),
  columnHelper.display({
    id: "actions",
    header: "Actions",
    cell: (info) => (
      <div className="flex space-x-2">
        <Link href={`/companies/${info.row.original.id}`}>
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
        <Link href={`/companies/${info.row.original.id}`}>
          <Button variant="ghost" size="sm">
            <Edit className="h-4 w-4" />
          </Button>
        </Link>
        <Button variant="ghost" size="sm" onClick={() => onDelete?.(info.row.original.id)}>
          <Trash className="h-4 w-4" />
        </Button>
      </div>
    ),
  }),
] satisfies ColumnDef<Company>[];

export default function CompaniesTable({ companies, onDelete, onBulkDelete }: CompaniesTableProps) {
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = useState({});

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: companies,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      globalFilter,
      columnVisibility,
      rowSelection,
    },
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
  });

  const handleExport = () => {
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
  };

  const selectedRows = table.getFilteredSelectedRowModel().rows;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search companies..."
          value={globalFilter ?? ""}
          onChange={(event) => setGlobalFilter(String(event.target.value))}
          className="max-w-sm"
        />
        <div className="flex space-x-2">
          {selectedRows.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {selectedRows.length} Firmen ausgewählt
            </span>
          )}
          <Button onClick={handleExport} className="bg-[#24BACC] text-white hover:bg-[#1da0a8]">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Columns</Button>
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
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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
