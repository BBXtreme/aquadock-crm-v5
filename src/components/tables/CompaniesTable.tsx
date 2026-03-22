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
  companies: any[];
  onEdit?: (company: Company) => void;
}

const columnHelper = createColumnHelper<any>();

export default function CompaniesTable({ companies, onEdit }: CompaniesTableProps) {
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const [columnVisibility, setColumnVisibility] = useState({});

  const columns: ColumnDef<any>[] = [
    columnHelper.accessor("firmenname", {
      id: "firmenname",
      header: "Firmenname",
      cell: (info) => (
        <Link href={`/companies/${info.row.original.id}`} className="text-blue-600 hover:underline">
          {safeDisplay(info.getValue() as string)}
        </Link>
      ),
    }),
    columnHelper.accessor("kundentyp", {
      header: "Kundentyp",
      cell: (info) => (
        <Badge variant="outline" className="bg-[#24BACC] text-white">
          {safeDisplay(info.getValue() as string)}
        </Badge>
      ),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: (info) => {
        const value = info.getValue() as string;
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
    columnHelper.accessor("contacts", {
      id: "hauptkontakt",
      header: "Hauptkontakt",
      cell: (info) => {
        const contacts = info.row.original.contacts || [];
        const primary = contacts.find((c: any) => c.is_primary);
        if (!primary) return "—";
        return (
          <div className="flex flex-col">
            <span className="font-medium">{`${primary.vorname} ${primary.nachname}`}</span>
            <span className="text-xs text-muted-foreground">{primary.email || "—"}</span>
          </div>
        );
      },
      enableSorting: false,
    }),
    columnHelper.accessor("value", {
      header: "Value",
      cell: (info) => formatCurrency(info.getValue() as number | null),
    }),
    columnHelper.accessor("stadt", {
      header: "Stadt",
      cell: (info) => safeDisplay(info.getValue() as string | null),
    }),
    columnHelper.accessor("land", {
      header: "Land",
      cell: (info) => safeDisplay(info.getValue() as string),
    }),
    columnHelper.accessor("created_at", {
      header: "Created",
      cell: (info) => formatDateDistance(info.getValue() as string | null),
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
          <Button variant="ghost" size="sm" onClick={() => onEdit?.(info.row.original)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      ),
    }),
  ];

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
    },
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
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
