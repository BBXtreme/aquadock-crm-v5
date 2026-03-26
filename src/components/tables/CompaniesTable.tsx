// Explicit ColumnDef<Company> casts used to satisfy TanStack Table generics
"use client";

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
import type { Company, Contact } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDateDistance, safeDisplay } from "@/lib/utils/data-format";

type CompanyWithContacts = Company & { contacts?: Contact[] };

interface CompaniesTableProps {
  companies: CompanyWithContacts[];
  onEdit?: (company: CompanyWithContacts) => void;
  onDelete?: (company: CompanyWithContacts) => void;
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
}

const columnHelper = createColumnHelper<CompanyWithContacts>();

export default function CompaniesTable({
  companies,
  onEdit,
  onDelete,
  globalFilter: propGlobalFilter,
  onGlobalFilterChange: propOnGlobalFilterChange,
}: CompaniesTableProps) {
  const [localGlobalFilter, setLocalGlobalFilter] = useState<string>("");
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = useState({});

  const globalFilter = propGlobalFilter ?? localGlobalFilter;
  const setGlobalFilter = propOnGlobalFilterChange ?? setLocalGlobalFilter;

  const columns = [
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
      cell: (info) => <Badge className="bg-[#24BACC] text-white">{safeDisplay(info.getValue() as string)}</Badge>,
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
        const contacts = (info.row.original.contacts || []) as Contact[];
        const primary = contacts.find((c) => c.is_primary);
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
    columnHelper.accessor("contacts", {
      id: "kontaktanzahl",
      header: "Kontakte",
      cell: (info) => {
        const contacts = (info.row.original.contacts || []) as Contact[];
        const count = contacts.length;
        if (count === 0) return <Badge variant="outline">Keine</Badge>;
        const hasPrimary = contacts.some((c) => c.is_primary);
        return (
          <Badge variant={hasPrimary ? "default" : "secondary"}>
            {count} {hasPrimary ? "(Primär)" : ""}
          </Badge>
        );
      },
      enableSorting: false,
    }),
    columnHelper.accessor("value", {
      header: "Value",
      cell: (info) => formatCurrency(info.getValue() as number | null),
    }),
    columnHelper.accessor("stadt", {
      id: "ort",
      header: "Ort",
      cell: (info) => {
        const row = info.row.original;
        const plz = row.plz ? `${row.plz} ` : "";
        const stadt = row.stadt || "";
        return `${plz}${stadt}` || "—";
      },
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm("Are you sure you want to delete this company?")) {
                try {
                  onDelete?.(info.row.original);
                } catch (error) {
                  console.error("Error deleting company:", error);
                  toast.error("Failed to delete company");
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
  ] satisfies ColumnDef<CompanyWithContacts>[];

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable<CompanyWithContacts>({
    data: companies,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
    initialState: {
      sorting: [{ id: "firmenname", desc: false }],
      pagination: { pageSize: 20 },
    },
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
      const link = document.createElement("a";
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `companies-export-${new Date().toISOString().split("T")[0]}.csv`);
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
      const link = document.createElement("a";
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `companies-export-${new Date().toISOString().split("T")[0]}.json`);
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
            placeholder="Search companies..."
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
