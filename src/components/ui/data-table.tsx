// src/components/ui/data-table.tsx
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { Download, Settings } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
  loading?: boolean;
  pageSize?: number;
  searchPlaceholder?: string;
}

export function DataTable<TData>({
  data,
  columns,
  globalFilter = "",
  onGlobalFilterChange,
  loading = false,
  pageSize = 20,
  searchPlaceholder = "Search...",
}: DataTableProps<TData>) {
  const [internalGlobalFilter, setInternalGlobalFilter] = useState(globalFilter);

  // Stable internal state
  const [internalPagination, setInternalPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const [internalRowSelection, setInternalRowSelection] = useState<RowSelectionState>({});
  const [internalColumnVisibility, setInternalColumnVisibility] = useState<VisibilityState>({});

  // Sync external globalFilter
  useEffect(() => {
    setInternalGlobalFilter(globalFilter);
  }, [globalFilter]);

  const handleGlobalFilterChange = useCallback(
    (value: string) => {
      setInternalGlobalFilter(value);
      onGlobalFilterChange?.(value);
    },
    [onGlobalFilterChange]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onGlobalFilterChange: handleGlobalFilterChange,
    onPaginationChange: setInternalPagination,
    onSortingChange: setInternalSorting,
    onRowSelectionChange: setInternalRowSelection,
    onColumnVisibilityChange: setInternalColumnVisibility,
    state: {
      globalFilter: internalGlobalFilter,
      pagination: internalPagination,
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
      }).join(",")
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

  return (
    <div>
      <div className="flex items-center justify-between py-4">
        <Input
          placeholder={searchPlaceholder}
          value={internalGlobalFilter}
          onChange={(e) => handleGlobalFilterChange(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table.getAllColumns().filter((col) => col.getCanHide()).map((col) => (
                <DropdownMenuItem key={col.id} onClick={() => col.toggleVisibility()}>
                  <Checkbox checked={col.getIsVisible()} className="mr-2" />
                  {col.id}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportToJSON}>
            <Download className="h-4 w-4 mr-2" />
            JSON
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
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
                        {header.column.getIsSorted() === "asc" && " ↑"}
                        {header.column.getIsSorted() === "desc" && " ↓"}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: pageSize }, (_, i) => `loading-row-${i + 1}`).map((key) => (
                <TableRow key={key}>
                  {columns.map((_, colIndex) => (
                    <TableCell key={`loading-cell-${key}-${colIndex + 1}`}>
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
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="h-8 w-[70px] rounded border border-input bg-transparent px-3 py-1 text-sm"
            >
              {[10, 20, 30, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              {"<<"}
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              {"<"}
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              {">"}
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              {">>"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}