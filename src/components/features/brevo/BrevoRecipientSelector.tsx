// src/components/features/brevo/BrevoRecipientSelector.tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import {
  type ColumnDef,
  type ColumnFiltersState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useEffect, useRef, useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { kundentypOptions, statusOptions } from "@/lib/constants/company-options";
import { createClient } from "@/lib/supabase/browser";
import type { Contact } from "@/types/database.types";

type ContactWithCompany = Contact & {
  companies: { kundentyp: string | null; status: string | null } | null;
};

/** Radix Select reserves "" for clearing; use a sentinel for "no filter". */
const FILTER_ALL = "__all__";

const columnHelper = createColumnHelper<ContactWithCompany>();

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
  }) as ColumnDef<ContactWithCompany>,
  columnHelper.accessor("vorname", {
    header: "Vorname",
    cell: (info) => info.getValue(),
  }) as ColumnDef<ContactWithCompany>,
  columnHelper.accessor("nachname", {
    header: "Nachname",
    cell: (info) => info.getValue(),
  }) as ColumnDef<ContactWithCompany>,
  columnHelper.accessor("email", {
    header: "Email",
    cell: (info) => info.getValue(),
  }) as ColumnDef<ContactWithCompany>,
  columnHelper.accessor("companies.kundentyp", {
    header: "Kundentyp",
    cell: (info) => info.getValue() || "",
  }) as ColumnDef<ContactWithCompany>,
  columnHelper.accessor("companies.status", {
    header: "Status",
    cell: (info) => info.getValue() || "",
  }) as ColumnDef<ContactWithCompany>,
];

export default function BrevoRecipientSelector({
  setSelectedRecipients,
}: {
  setSelectedRecipients: (recipients: string[]) => void;
}) {
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts-with-company"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("contacts")
        .select("*, companies(kundentyp, status)");
      if (error) throw error;
      return data as ContactWithCompany[];
    },
    staleTime: 60 * 1000,
  });

  const table = useReactTable({
    data: contacts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    state: {
      rowSelection,
      globalFilter,
      columnFilters,
    },
  });

  // `table` from useReactTable changes identity often; depending on it + always
  // calling setSelectedRecipients([]) (new array reference) caused parent re-render loops.
  const tableRef = useRef(table);
  tableRef.current = table;

  const lastPushedIds = useRef<string[] | null>(null);

  // rowSelection in deps: ref does not change when user toggles rows; Biome cannot see tableRef → selection.
  // biome-ignore lint/correctness/useExhaustiveDependencies: rowSelection drives recipient sync
  useEffect(() => {
    const selectedIds = tableRef.current
      .getSelectedRowModel()
      .rows.map((row) => row.original.id)
      .filter((id): id is string => typeof id === "string");

    const last = lastPushedIds.current;
    if (
      last !== null &&
      last.length === selectedIds.length &&
      last.every((id, i) => id === selectedIds[i])
    ) {
      return;
    }
    lastPushedIds.current = selectedIds;
    setSelectedRecipients(selectedIds);
  }, [rowSelection, setSelectedRecipients]);

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Input
          placeholder="Search contacts..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <Select
          value={
            (columnFilters.find((f) => f.id === "companies.kundentyp")?.value as string | undefined) ??
            FILTER_ALL
          }
          onValueChange={(value) =>
            setColumnFilters((prev) => {
              const rest = prev.filter((f) => f.id !== "companies.kundentyp");
              if (value === FILTER_ALL) return rest;
              return [...rest, { id: "companies.kundentyp", value }];
            })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Kundentyp" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>All</SelectItem>
            {kundentypOptions.map((option) => (
              <SelectItem key={option.value} value={option.label}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={
            (columnFilters.find((f) => f.id === "companies.status")?.value as string | undefined) ??
            FILTER_ALL
          }
          onValueChange={(value) =>
            setColumnFilters((prev) => {
              const rest = prev.filter((f) => f.id !== "companies.status");
              if (value === FILTER_ALL) return rest;
              return [...rest, { id: "companies.status", value }];
            })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={FILTER_ALL}>All</SelectItem>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.label}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
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
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <button
            type="button"
            className="px-2 py-1 border rounded"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </button>
          <button
            type="button"
            className="px-2 py-1 border rounded"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
