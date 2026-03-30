// src/components/features/companies/CompaniesTable.tsx
// This file defines the CompaniesTable component, which displays a table of companies with sorting, filtering, and pagination.
// It uses TanStack Table to manage the table state and provides actions for editing and deleting companies.
// The table includes columns for company name, address, contact details, status, category, and associated contacts.
// It also includes a global search filter and pagination controls.
// The component is designed to be reusable and accepts props for the companies data, filters, and callbacks for actions.

import { type ColumnDef, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { ArrowUpDown, Building, Checkbox, Edit, MoreHorizontal, Trash, Users } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Company, Contact } from "@/lib/supabase/database.types";
import { safeDisplay } from "@/lib/utils/data-format";

type CompanyWithContacts = Company & { contacts?: Contact[] };

interface CompaniesTableProps {
  companies: CompanyWithContacts[];
  globalFilter?: string;
  onGlobalFilterChange?: (value: string) => void;
  onEdit?: (company: CompanyWithContacts) => void;
  onDelete?: (companyOrId: string | CompanyWithContacts) => void;
  pageCount: number;
  onPaginationChange: (pagination: { pageIndex: number; pageSize: number }) => void;
  sorting: { id: string; desc: boolean }[];
  onSortingChange: (sorting: { id: string; desc: boolean }[]) => void;
  onImportCSV?: () => void;
  rowSelection?: Record<string, boolean>;
  onRowSelectionChange?: (updaterOrValue: Record<string, boolean> | ((old: Record<string, boolean>) => Record<string, boolean>)) => void;
}

export default function CompaniesTable({
  companies,
  globalFilter,
  onGlobalFilterChange,
  onEdit,
  onDelete,
  pageCount,
  onPaginationChange,
  sorting,
  onSortingChange,
  onImportCSV,
  rowSelection = {},
  onRowSelectionChange,
}: CompaniesTableProps) {
  const [columnVisibility, setColumnVisibility] = useState({});

  const columns: ColumnDef<CompanyWithContacts>[] = [
    {
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
      enableHiding: false,
    },
    {
      accessorKey: "firmenname",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Company
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{safeDisplay(row.original.firmenname)}</div>
            {row.original.kundentyp && (
              <div className="text-sm text-muted-foreground">{row.original.kundentyp}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "stadt",
      header: "Address",
      cell: ({ row }) => (
        <div className="text-sm">
          <div>{safeDisplay(row.original.strasse)}</div>
          <div className="text-muted-foreground">
            {safeDisplay(row.original.plz)} {safeDisplay(row.original.stadt)}
          </div>
          <div className="text-muted-foreground">{safeDisplay(row.original.land)}</div>
        </div>
      ),
    },
    {
      accessorKey: "telefon",
      header: "Contact",
      cell: ({ row }) => (
        <div className="text-sm">
          <div>{safeDisplay(row.original.telefon)}</div>
          <div className="text-muted-foreground">{safeDisplay(row.original.email)}</div>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <Badge
            className={
              status === "gewonnen"
                ? "bg-emerald-600 text-white"
                : status === "lead"
                  ? "bg-amber-600 text-white"
                  : "bg-zinc-500 text-white"
            }
          >
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "value",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-semibold"
        >
          Value
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-sm">€{safeDisplay(row.original.value)}</div>,
    },
    {
      accessorKey: "contacts",
      header: "Contacts",
      cell: ({ row }) => {
        const contacts = row.original.contacts || [];
        const primaryContact = contacts.find((c) => c.is_primary);
        const otherContacts = contacts.filter((c) => !c.is_primary);

        return (
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              {primaryContact && (
                <div className="font-medium">
                  {primaryContact.vorname} {primaryContact.nachname}
                </div>
              )}
              {otherContacts.length > 0 && (
                <div className="text-muted-foreground">+{otherContacts.length} more</div>
              )}
              {contacts.length === 0 && <div className="text-muted-foreground">None</div>}
            </div>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(row.original)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                onClick={() => onDelete(row.original)}
                className="text-destructive focus:text-destructive"
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const table = useReactTable({
    data: companies,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: onGlobalFilterChange,
    onPaginationChange: (updaterOrValue) => {
      const newPagination = typeof updaterOrValue === 'function' ? updaterOrValue(table.getState().pagination) : updaterOrValue;
      onPaginationChange(newPagination);
    },
    onSortingChange: (updaterOrValue) => {
      const newSorting = typeof updaterOrValue === 'function' ? updaterOrValue(table.getState().sorting) : updaterOrValue;
      onSortingChange(newSorting);
    },
    enableRowSelection: true,
    onRowSelectionChange: onRowSelectionChange,
    state: {
      globalFilter,
      columnVisibility,
      pagination: { pageIndex: 0, pageSize: 20 },
      sorting,
      rowSelection,
    },
    manualPagination: true,
    pageCount,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search companies..."
            value={globalFilter ?? ""}
            onChange={(event) => onGlobalFilterChange?.(event.target.value)}
            className="max-w-sm"
          />
        </div>
        {onImportCSV && (
          <Button onClick={onImportCSV} variant="outline">
            Import CSV
          </Button>
        )}
      </div>

      <div className="rounded-md border">
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

      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPaginationChange({ pageIndex: 0, pageSize: 20 })}
            disabled={!table.getCanPreviousPage()}
          >
            First
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPaginationChange({ pageIndex: table.getState().pagination.pageIndex - 1, pageSize: 20 })}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPaginationChange({ pageIndex: table.getState().pagination.pageIndex + 1, pageSize: 20 })}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPaginationChange({ pageIndex: pageCount - 1, pageSize: 20 })}
            disabled={!table.getCanNextPage()}
          >
            Last
          </Button>
        </div>
      </div>
    </div>
  );
}
