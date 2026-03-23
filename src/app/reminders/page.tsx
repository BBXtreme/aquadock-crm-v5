"use client";

import { useCallback, useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, isAfter, isThisWeek } from "date-fns";
import { AlertTriangle, Bell, Calendar, Star } from "lucide-react";
import { toast } from "sonner";

import ReminderCreateForm from "@/components/features/ReminderCreateForm";
import ReminderEditForm from "@/components/features/ReminderEditForm";
import AppLayout from "@/components/layout/AppLayout";
import RemindersTable from "@/components/tables/RemindersTable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SkeletonList } from "@/components/ui/SkeletonList";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/browser";
import { deleteReminder, getReminders } from "@/lib/supabase/services/reminders";

export default function RemindersPage() {
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const [rowSelection, _setRowSelection] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editReminder, setEditReminder] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<any>(null);
  const [_columnVisibility, _setColumnVisibility] = useState({});
  const [filterType, setFilterType] = useState<"all" | "open" | "overdue">("all");

  const queryClient = useQueryClient();

  const {
    data: reminders,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["reminders"],
    queryFn: async () => {
      const supabase = createClient();
      return getReminders(supabase);
    },
  });

  console.log("RemindersPage render", {
    remindersLength: reminders?.length || 0,
    rowSelection,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteReminder(id, createClient()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      toast.success("Reminder deleted");
    },
    onError: (err) => toast.error("Deletion failed", { description: err.message }),
  });

  const handleDelete = useCallback(
    (id: string) => {
      if (confirm("Delete this reminder?")) deleteMutation.mutate(id);
    },
    [deleteMutation],
  );

  const handleView = useCallback((reminder: any) => {
    setSelectedReminder(reminder);
    setIsViewOpen(true);
  }, []);

  const handleEdit = useCallback((reminder) => {
    if (reminder) {
      setEditReminder(reminder);
    }
  }, []);

  const allReminders = reminders || [];
  const filteredReminders = useMemo(() => {
    if (filterType === "all") return allReminders;
    return allReminders.filter((r) => {
      if (filterType === "open") {
        return r.status === "open" && isAfter(new Date(r.due_date), new Date());
      }
      if (filterType === "overdue") {
        return r.status === "open" && !isAfter(new Date(r.due_date), new Date());
      }
      return true;
    });
  }, [allReminders, filterType]);

  const openReminders = allReminders.filter((r) => r.status === "open").length;
  const overdue = allReminders.filter((r) => r.status === "open" && isAfter(new Date(), new Date(r.due_date))).length;
  const thisWeek = allReminders.filter((r) => r.status === "open" && isThisWeek(new Date(r.due_date))).length;
  const highPriority = allReminders.filter((r) => r.status === "open" && r.priority === "hoch").length;

  if (isLoading)
    return (
      <AppLayout>
        <div className="container mx-auto space-y-8 p-6 lg:p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Home → Follow-up Reminders</p>
              <h1 className="font-semibold text-3xl tracking-tight">Follow-up Reminders</h1>
            </div>
            <Button>New Reminder</Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Loading reminders...</CardTitle>
            </CardHeader>
            <CardContent>
              <SkeletonList count={10} />
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );

  if (isError)
    return (
      <Alert variant="destructive">
        <AlertTitle>Error loading reminders</AlertTitle>
        <AlertDescription>{error?.message}</AlertDescription>
        <Button onClick={() => refetch()}>Retry</Button>
      </Alert>
    );

  if (filteredReminders.length === 0)
    return (
      <AppLayout>
        <div className="container mx-auto space-y-8 p-6 lg:p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Home → Follow-up Reminders</p>
              <h1 className="font-semibold text-3xl tracking-tight">Follow-up Reminders</h1>
            </div>
            <Button>New Reminder</Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>No reminders yet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Create your first reminder to stay on top of tasks.</p>
              <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                New Reminder
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );

  return (
    <AppLayout>
      <div className="container mx-auto space-y-8 p-6 lg:p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Home → Follow-up Reminders</p>
            <h1 className="font-semibold text-3xl tracking-tight">Follow-up Reminders</h1>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>New Reminder</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Reminder</DialogTitle>
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
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="font-bold text-2xl">{openReminders}</div>
              )}
            </CardContent>
          </Card>
          <Card className="bg-card border border-border rounded-xl shadow-sm text-card-foreground">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">Overdue Today</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="font-bold text-2xl text-red-500">{overdue}</div>
              )}
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
          <Button variant={filterType === "all" ? "default" : "outline"} onClick={() => setFilterType("all")}>
            All
          </Button>
          <Button variant={filterType === "open" ? "default" : "outline"} onClick={() => setFilterType("open")}>
            Open
          </Button>
          <Button variant={filterType === "overdue" ? "default" : "outline"} onClick={() => setFilterType("overdue")}>
            Overdue
          </Button>
          <Button variant="outline">My Tasks</Button>
        </div>

        <Card className="bg-card border border-border rounded-xl shadow-sm text-card-foreground">
          <CardContent className="p-6">
            <RemindersTable
              reminders={filteredReminders}
              globalFilter={globalFilter}
              onGlobalFilterChange={setGlobalFilter}
              handleEdit={handleEdit}
              handleView={handleView}
              handleDelete={handleDelete}
            />
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>View Reminder</DialogTitle>
              <DialogDescription>Details of the selected reminder.</DialogDescription>
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
                  <p>
                    {selectedReminder.due_date
                      ? formatDistanceToNow(new Date(selectedReminder.due_date), { addSuffix: true })
                      : "—"}
                  </p>
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
              </div>
            )}
          </DialogContent>
        </Dialog>

        {editReminder && (
          <Dialog open={!!editReminder} onOpenChange={() => setEditReminder(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Reminder</DialogTitle>
              </DialogHeader>
              <ReminderEditForm reminder={editReminder} onSuccess={() => setEditReminder(null)} />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppLayout>
  );
}
