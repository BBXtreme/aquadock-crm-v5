"use client";

import { useCallback, useMemo, useState } from "react";

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
import { AlertTriangle, Bell, Calendar, Edit, Eye, Plus, RefreshCw, Star, Trash } from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import ReminderCreateForm from "@/components/features/ReminderCreateForm";
import ReminderEditForm from "@/components/features/ReminderEditForm";
import { SkeletonList } from "@/components/ui/SkeletonList";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/browser";
import { createReminder, deleteReminder, getReminders, updateReminder } from "@/lib/supabase/services/reminders";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const columnHelper = createColumnHelper<any>();

export default function RemindersPage() {
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const [rowSelection, setRowSelection] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedReminder, setSelectedReminder] = useState<any>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const queryClient = useQueryClient();

  const queryFn = useCallback(async () => {
    try {
      const supabase = createClient();
      return await getReminders(supabase);
    } catch (err) {
      console.error("Error fetching reminders:", err);
      throw err;
    }
  }, []);

  const {
    data: allReminders = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["reminders"],
    queryFn,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteReminder(id, createClient()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      toast.success("Reminder deleted");
    },
    onError: (err) => toast.error("Deletion failed", { description: err.message }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => updateReminder(id, updates, createClient()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      toast.success("Reminder updated");
    },
    onError: (err) => toast.error("Update failed", { description: err.message }),
  });

  const reminders = Array.isArray(allReminders) ? allReminders : [];

  const filteredReminders = useMemo(() => {
    if (statusFilter === "all") return reminders;
    if (statusFilter === "open") return reminders.filter((r) => r.status === "open");
    if (statusFilter === "overdue") return reminders.filter((r) => isAfter(new Date(), new Date(r.due_date)));
    return reminders;
  }, [reminders, statusFilter]);

  const openReminders = Array.isArray(allReminders) ? allReminders.filter((r) => r.status === "open").length : 0;
  const overdue = Array.isArray(allReminders) ? allReminders.filter((r) => r.status === "open" && isAfter(new Date(), new Date(r.due_date))).length : 0;
  const thisWeek = Array.isArray(allReminders) ? allReminders.filter((r) => r.status === "open" && isThisWeek(new Date(r.due_date))).length : 0;
  const highPriority = Array.isArray(allReminders) ? allReminders.filter((r) => r.status === "open" && r.priority === "hoch").length : 0;

  const columns = useMemo(() => [
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
      cell: (info) => {
        try {
          const company = info.row.original.companies;
          if (!company) return "—";
          return (
            <Link href={`/companies/${info.row.original.company_id}`} className="text-blue-600 hover:underline">
              {company.firmenname}
            </Link>
          );
        } catch {
          return "—";
        }
      },
    }),
    columnHelper.accessor("due_date", {
      header: "Due Date",
      cell: (info) => {
        try {
          const dueDate = info.getValue() as string;
          if (!dueDate) return "—";
          const isOverdue = isAfter(new Date(), new Date(dueDate));
          return (
            <span className={isOverdue ? "text-rose-500" : ""}>
              {formatDistanceToNow(new Date(dueDate), {
                addSuffix: true,
              })}
            </span>
          );
        } catch {
          return "Invalid date";
        }
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
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (info) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedReminder(info.row.original);
              setIsViewOpen(true);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedReminder(info.row.original);
              setIsEditOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm("Are you sure you want to delete this reminder?")) {
                deleteMutation.mutate(info.row.original.id);
              }
            }}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      ),
    }),
  ], []);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filteredReminders || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { globalFilter, rowSelection },
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getRowId: (row) => row.id,
  });

  const handleBulkDelete = () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    if (selectedRows.length === 0) return;
    if (confirm(`Delete ${selectedRows.length} selected reminders?`)) {
      selectedRows.forEach((row) => {
        deleteMutation.mutate(row.original.id);
      });
      setRowSelection({});
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto space-y-8 p-6 lg:p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Home → Reminders</p>
            <h1 className="font-semibold text-3xl tracking-tight">Reminders</h1>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Reminder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Reminder</DialogTitle>
                <DialogDescription>
                  Create a new reminder for a company to track follow-ups and tasks.
                </DialogDescription>
              </DialogHeader>
              <ReminderCreateForm onSuccess={() => setDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card border border-border rounded-xl shadow-sm text-card-foreground">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">Open Reminders</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="font-bold text-2xl">{openReminders}</div>}
            </CardContent>
          </Card>
          <Card className="bg-card border border-border rounded-xl shadow-sm text-card-foreground">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">Overdue Today</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="font-bold text-2xl">{overdue}</div>}
            </CardContent>
          </Card>
          <Card className="bg-card border border-border rounded-xl shadow-sm text-card-foreground">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">This Week</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="font-bold text-2xl">{thisWeek}</div>}
            </CardContent>
          </Card>
          <Card className="bg-card border border-border rounded-xl shadow-sm text-card-foreground">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">High Priority</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="font-bold text-2xl">{highPriority}</div>}
            </CardContent>
          </Card>
        </div>

        <div className="flex space-x-2">
          <Button variant={statusFilter === "all" ? "default" : "outline"} onClick={() => setStatusFilter("all")}>All</Button>
          <Button variant={statusFilter === "open" ? "default" : "outline"} onClick={() => setStatusFilter("open")}>Open</Button>
          <Button variant={statusFilter === "overdue" ? "default" : "outline"} onClick={() => setStatusFilter("overdue")}>Overdue</Button>
          <Button variant="outline">My Tasks</Button>
        </div>

        <Card className="bg-card border border-border rounded-xl shadow-sm text-card-foreground">
          <CardContent className="p-6">
            {(() => {
              if (isLoading) return <SkeletonList count={10} />;
              if (isError) return (
                <Alert variant="destructive">
                  <AlertTitle>Error loading reminders</AlertTitle>
                  <AlertDescription>{error?.message}</AlertDescription>
                  <Button onClick={() => refetch()}>Retry</Button>
                </Alert>
              );
              if (table.getRowModel().rows.length === 0) return (
                <Alert>No reminders found. Create one to get started.</Alert>
              );
              return (
                <>
                  <div className="flex items-center space-x-4 mb-4">
                    <Input
                      placeholder="Search reminders..."
                      value={globalFilter ?? ""}
                      onChange={(event) => setGlobalFilter(String(event.target.value))}
                      className="max-w-sm"
                    />
                    {table.getFilteredSelectedRowModel().rows.length > 0 && (
                      <>
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {table.getFilteredSelectedRowModel().rows.length} selected
                        </span>
                        <Button variant="destructive" onClick={handleBulkDelete}>
                          Delete Selected
                        </Button>
                      </>
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
              );
            })()}
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>View Reminder</DialogTitle>
              <DialogDescription>
                Details of the selected reminder.
              </DialogDescription>
            </DialogHeader>
            {selectedReminder && (
              <div className="space-y-4">
                <div>
                  <label className="font-medium">Title:</label>
                  <p>{selectedReminder.title || "—"}</p>
                </div>
                <div>
                  <label className="font-medium">Company:</label>
                  <p>{selectedReminder.companies?.firmenname || "—"}</p>
                </div>
                <div>
                  <label className="font-medium">Due Date:</label>
                  <p>{selectedReminder.due_date ? formatDistanceToNow(new Date(selectedReminder.due_date), { addSuffix: true }) : "—"}</p>
                </div>
                <div>
                  <label className="font-medium">Priority:</label>
                  <p>{selectedReminder.priority || "—"}</p>
                </div>
                <div>
                  <label className="font-medium">Status:</label>
                  <p>{selectedReminder.status || "—"}</p>
                </div>
                <div>
                  <label className="font-medium">Assigned To:</label>
                  <p>{selectedReminder.assigned_to || "—"}</p>
                </div>
                <div>
                  <label className="font-medium">Notes:</label>
                  <p>{selectedReminder.notes || "—"}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Reminder</DialogTitle>
              <DialogDescription>
                Update the details of the selected reminder.
              </DialogDescription>
            </DialogHeader>
            {selectedReminder && (
              <ReminderEditForm
                reminder={selectedReminder}
                onSuccess={() => {
                  setIsEditOpen(false);
                  setSelectedReminder(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
