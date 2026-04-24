// src/components/ui/data-table.tsx
"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type OnChangeFn,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, Columns, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getTablePageRange } from "@/lib/utils/table-page-range";

export type DataTableLabels = {
  exportCsv: string;
  exportJson: string;
  rowsPerPage: string;
  previous: string;
  next: string;
  empty: string;
  columnsTriggerAria: string;
  exportTriggerAria: string;
  rowSelectionSummary: (selected: number, total: number) => string;
  /** Shown after the selection summary (e.g. “Rows 1–20 of 100”). */
  pageRangeSummary: (from: number, to: number, total: number) => string;
};

const defaultLabels: DataTableLabels = {
  exportCsv: "Export CSV",
  exportJson: "Export JSON",
  rowsPerPage: "Rows per page",
  previous: "Previous",
  next: "Next",
  empty: "No results.",
  columnsTriggerAria: "Toggle columns",
  exportTriggerAria: "Export data",
  rowSelectionSummary: (selected, total) => `${selected} of ${total} row(s) selected.`,
  pageRangeSummary: (from, to, total) =>
    total <= 0 ? "No entries." : `Rows ${from}–${to} of ${total}`,
};

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
  loading?: boolean;
  pageSize?: number;
  searchPlaceholder?: string;
  pagination?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;
  totalCount?: number;
  skeletonRows?: number;
  /** Human-readable labels in the column visibility menu (matches companies/contacts tables). */
  columnMenuLabel?: (columnId: string) => string;
  /** Toolbar & footer copy; defaults to English. */
  labels?: Partial<DataTableLabels>;
}

export function DataTable<TData>({
  data,
  columns,
  globalFilter = "",
  onGlobalFilterChange,
  loading = false,
  pageSize = 20,
  searchPlaceholder = "Search...",
  pagination,
  onPaginationChange,
  totalCount,
  skeletonRows,
  columnMenuLabel,
  labels: labelsProp,
}: DataTableProps<TData>) {
  const labels = useMemo(() => ({ ...defaultLabels, ...labelsProp }), [labelsProp]);

  const [internalGlobalFilter, setInternalGlobalFilter] = useState(globalFilter);

  const [internalPagination, setInternalPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const [internalRowSelection, setInternalRowSelection] = useState<RowSelectionState>({});
  const [internalColumnVisibility, setInternalColumnVisibility] = useState<VisibilityState>({});

  useEffect(() => {
    setInternalGlobalFilter(globalFilter);
  }, [globalFilter]);

  const handleGlobalFilterChange = useCallback(
    (value: string) => {
      setInternalGlobalFilter(value);
      onGlobalFilterChange?.(value);
    },
    [onGlobalFilterChange],
  );

  const currentPagination = pagination || internalPagination;
  const currentOnPaginationChange = onPaginationChange || setInternalPagination;

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onGlobalFilterChange: handleGlobalFilterChange,
    onPaginationChange: currentOnPaginationChange,
    onSortingChange: setInternalSorting,
    onRowSelectionChange: setInternalRowSelection,
    onColumnVisibilityChange: setInternalColumnVisibility,
    manualPagination: !!pagination,
    pageCount: totalCount ? Math.ceil(totalCount / (currentPagination.pageSize || 10)) : undefined,
    state: {
      globalFilter: internalGlobalFilter,
      pagination: currentPagination,
      sorting: internalSorting,
      rowSelection: internalRowSelection,
      columnVisibility: internalColumnVisibility,
    },
  });

  const exportToCSV = useCallback(() => {
    const visibleColumns = table.getVisibleFlatColumns();
    const headers = visibleColumns.map((col) => col.id).join(",");
    const rows = table.getFilteredRowModel().rows.map((row) =>
      visibleColumns.map((col) => {
        const value = row.getValue(col.id);
        return typeof value === "string" ? `"${value.replace(/"/g, '""')}"` : String(value || "");
      }).join(","),
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [table]);

  const exportToJSON = useCallback(() => {
    const json = JSON.stringify(table.getFilteredRowModel().rows.map((row) => row.original), null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [table]);

  const visibleLeafColumns = loading ? columns : table.getVisibleLeafColumns();
  const emptyColSpan = Math.max(visibleLeafColumns.length, 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Input
            placeholder={searchPlaceholder}
            value={internalGlobalFilter}
            onChange={(e) => handleGlobalFilterChange(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <div className="flex space-x-2">
          <div className="flex items-center gap-2">
            <span className="sr-only">{labels.rowsPerPage}</span>
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(v) => table.setPageSize(Number(v))}
            >
              <SelectTrigger className="h-8 w-[70px]" aria-label={labels.rowsPerPage}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 30, 50].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" type="button" aria-label={labels.exportTriggerAria}>
                <Upload className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportToCSV()}>{labels.exportCsv}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportToJSON()}>{labels.exportJson}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" type="button" aria-label={labels.columnsTriggerAria}>
                <Columns className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  const label = columnMenuLabel ? columnMenuLabel(column.id) : column.id;
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className={cn(!columnMenuLabel && "capitalize")}
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
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-auto min-h-0 w-full justify-start gap-2 rounded-none px-4 py-4 font-medium hover:bg-muted/50"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === "asc" && <ArrowUp className="h-4 w-4" />}
                        {header.column.getIsSorted() === "desc" && <ArrowDown className="h-4 w-4" />}
                      </Button>
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
            {loading ? (
              Array.from({ length: skeletonRows || pageSize }, (_, i) => `loading-row-${i + 1}`).map((key) => (
                <TableRow
                  key={key}
                  className="border-border/10 dark:border-border/14 hover:bg-transparent"
                >
                  {visibleLeafColumns.map((column, colIndex) => (
                    <TableCell key={`loading-cell-${column.id || colIndex}`}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={emptyColSpan} className="h-24 text-center">
                  {labels.empty}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-sm">
          <span>
            {labels.rowSelectionSummary(
              table.getFilteredSelectedRowModel().rows.length,
              table.getFilteredRowModel().rows.length,
            )}
          </span>
          <span className="ml-auto flex flex-wrap items-center gap-x-2">
            <span className="select-none text-muted-foreground/45" aria-hidden>
              ·
            </span>
            <span>
              {(() => {
                const totalFiltered = table.getFilteredRowModel().rows.length;
                const rowCountOnPage = table.getRowModel().rows.length;
                const { pageIndex, pageSize } = table.getState().pagination;
                const pr = getTablePageRange({
                  pageIndex,
                  pageSize,
                  rowCountOnPage,
                  totalFiltered,
                });
                return labels.pageRangeSummary(pr.from, pr.to, pr.total);
              })()}
            </span>
          </span>
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            {labels.previous}
          </Button>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            {labels.next}
          </Button>
        </div>
      </div>
    </div>
  );
}
