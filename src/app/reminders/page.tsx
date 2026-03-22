"use client";

import { useState } from "react";

import Link from "next/link";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow, isAfter, isThisWeek } from "date-fns";
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
import { AlertTriangle, Bell, Calendar, RefreshCw, Star } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { SkeletonList } from "@/components/ui/SkeletonList";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/browser";
import { getReminders } from "@/lib/supabase/services/reminders";

export default function RemindersPage() {
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = useState({});

  const {
    data: allReminders = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["reminders"],
    queryFn: async () => {
      const supabase = createClient();
      return getReminders(supabase);
    },
  });

  const reminders = allReminders.filter((r) => r.status === "open");

  const openReminders = allReminders.filter((r) => r.status === "open").length;
  const overdue = allReminders.filter((r) => r.status === "open" && isAfter(new Date(), new Date(r.due_date))).length;
  const thisWeek = allReminders.filter((r) => r.status === "open" && isThisWeek(new Date(r.due_date))).length;
  const highPriority = allReminders.filter((r) => r.status === "open" && r.priority === "high").length;

  const columnHelper = createColumnHelper<any>();

  const columns: ColumnDef<any>[] = [
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
    }),
    columnHelper.accessor("title", {
      header: "Title",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("companies.firmenname", {
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
        <Badge
          className={
            info.getValue() === "open" ? "bg-emerald-600 text-white" : "bg-zinc-500 text-white"
          }
        >
          {info.getValue()}
        </Badge>
      ),
    }),
    columnHelper.accessor("assigned_to", {
      header: "Assigned To",
      cell: (info) => info.getValue(),
    }),
  ];

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: reminders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
    state: {
      globalFilter,
      columnVisibility,
      rowSelection,
    },
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
  });

  if (error) {
    return (
      <AppLayout>
        <div className="container mx-auto space-y-8 p-6 lg:p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Home → Reminders</p>
              <h1 className="font-semibold text-3xl tracking-tight">Reminders</h1>
            </div>
            <Button>New Reminder</Button>
          </div>
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>{error.message}</span>
              <Button variant="outline" onClick={() => window.location.reload()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Erneut versuchen
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto space-y-8 p-6 lg:p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Home → Reminders</p>
            <h1 className="font-semibold text-3xl tracking-tight">Reminders</h1>
          </div>
          <Button>New Reminder</Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card border border-border rounded-xl shadow-sm text-card-foreground">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">Open Reminders</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-16" /> : <div className="font-bold text-2xl">{openReminders}</div>}
            </CardContent>
          </Card>
          <Card className="bg-card border border-border rounded-xl shadow-sm text-card-foreground">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">Overdue Today</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-16" /> : <div className="font-bold text-2xl">{overdue}</div>}
            </CardContent>
          </Card>
          <Card className="bg-card border border-border rounded-xl shadow-sm text-card-foreground">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">This Week</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-16" /> : <div className="font-bold text-2xl">{thisWeek}</div>}
            </CardContent>
          </Card>
          <Card className="bg-card border border-border rounded-xl shadow-sm text-card-foreground">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">High Priority</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-16" /> : <div className="font-bold text-2xl">{highPriority}</div>}
            </CardContent>
          </Card>
        </div>

        <div className="flex space-x-2">
          <Button variant="outline">All</Button>
          <Button variant="outline">Open</Button>
          <Button variant="outline">Overdue</Button>
          <Button variant="outline">My Tasks</Button>
        </div>

        <Card className="bg-card border border-border rounded-xl shadow-sm text-card-foreground">
          <CardContent className="p-6">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <SkeletonList count={5} className="space-y-2" itemClassName="h-12 w-full" />
              </div>
            ) : (
              <>
                <div className="flex items-center space-x-4 mb-4">
                  <Input
                    placeholder="Search reminders..."
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
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
