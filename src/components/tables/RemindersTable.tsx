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
import { formatDistanceToNow, isAfter } from "date-fns";
import { ArrowDown, ArrowUp, ArrowUpDown, Columns, Edit, Eye, Trash } from "lucide-react";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const columnHelper = createColumnHelper<any>();

export const reminderColumns = (
  handleEdit: (reminder: any) => void,
  handleView: (reminder: any) => void,
  handleDelete: (id: string) => void,
): ColumnDef<any>[] => [
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
  columnHelper.accessor("title", {
    header: "Title",
    cell: (info) => (
      <button className="text-blue-600 hover:underline" onClick={() => handleEdit(info.row.original)}>
        {info.getValue()}
      </button>
    ),
  }),
  columnHelper.accessor("companies.firmenname", {
    id: "company",
    header: "Company",
    cell: (info) => (
      <Link href={`/companies/${info.row.original.company_id}`} className="text-blue-600 hover:underline">
        {info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor("due_date", {
    header: "Due Date",
    cell: (info) => {
      const isOverdue = isAfter(new Date(), new Date(info.getValue() as string));
      return (
        <span className={isOverdue ? "text-rose-500" : ""}>
          {formatDistanceToNow(new Date(info.getValue() as string), {
            addSuffix: true,
          })}
        </span>
      );
    },
  }),
  columnHelper.accessor("priority", {
    header: "Priority",
    cell: (info) => (
      <Badge
        className={
          info.getValue() === "hoch"
            ? "bg-orange-500 text-white"
            : info.getValue() === "normal"
              ? "bg-blue-500 text-white"
              : "bg-gray-500 text-white"
        }
      >
        {info.getValue()}
      </Badge>
    ),
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: (info) => (
      <Badge className={info.getValue() === "open" ? "bg-emerald-600 text-white" : "bg-zinc-500 text-white"}>
        {info.getValue()}
      </Badge>
    ),
  }),
  columnHelper.accessor("assigned_to", {
    header: "Assigned To",
    cell: (info) => info.getValue(),
  }),
  columnHelper.display({
    id: "actions",
    header: "Actions",
    cell: (info) => (
      <div className="flex space-x-2">
        <Button variant="ghost" size="sm" onClick={() => handleView(info.row.original)}>
          <Eye className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => handleEdit(info.row.original)}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => handleDelete(info.row.original.id)}>
          <Trash className="h-4 w-4" />
        </Button>
      </div>
    ),
    enableSorting: false,
  }),
];

interface RemindersTableProps {
  reminders: any[];
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
  handleEdit: (reminder: any) => void;
  handleView: (reminder: any) => void;
  handleDelete: (id: string) => void;
}

export default function RemindersTable({
  reminders,
  globalFilter,
  onGlobalFilterChange,
  handleEdit,
  handleView,
  handleDelete,
}: RemindersTableProps) {
  const [rowSelection, setRowSelection] = useState({});
  const [columnVisibility, setColumnVisibility] = useState({});

  const columns = reminderColumns(handleEdit, handleView, handleDelete);

  const table = useReactTable({
    data: reminders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: { sorting: [{ id: "due_date", desc: false }], pagination: { pageSize: 20 } },
    state: { rowSelection, columnVisibility, globalFilter },
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange,
    enableRowSelection: true,
    getRowId: (row) => row.id,
    globalFilterFn: "includesString",
    filterFromLeafRows: true,
  });

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <Input
            placeholder="Search reminders..."
            value={globalFilter ?? ""}
            onChange={(event) => onGlobalFilterChange?.(String(event.target.value))}
            className="max-w-sm"
          />
          {table.getFilteredSelectedRowModel().rows.length > 0 && (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {table.getFilteredSelectedRowModel().rows.length} selected
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Select
            value={table.getState().pagination.pageSize.toString()}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="30">30</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          {table.getFilteredSelectedRowModel().rows.length > 0 && (
            <Button variant="destructive" size="sm">
              Delete Selected
            </Button>
          )}
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
      <div className="rounded-md border">
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
    </>
  );
}
