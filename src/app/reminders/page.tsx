"use client";

import { useCallback, useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, isAfter, isThisWeek } from "date-fns";
import { AlertTriangle, Bell, Calendar, Star } from "lucide-react";
import { toast } from "sonner";

import ReminderCreateForm from "@/components/features/ReminderCreateForm";
import ReminderEditForm from "@/components/features/ReminderEditForm";
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
import { WideDialogContent } from "@/components/ui/wide-dialog";
import { createClient } from "@/lib/supabase/browser";
import { deleteReminder, getReminders } from "@/lib/supabase/services/reminders";
import { cn } from "@/lib/utils";

export default function RemindersPage() {
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const [rowSelection, _setRowSelection] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editReminder, setEditReminder] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
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

  const handleView = useCallback((reminder: Reminder) => {
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
      <div className="container mx-auto space-y-8 p-6 lg:p-8">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">Home → Follow-up Reminders</p>
          <h1 className="font-semibold text-3xl tracking-tight">Follow-up Reminders</h1>
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
      <div className="container mx-auto space-y-8 p-6 lg:p-8">
        <div className="flex items-center justify-between pb-6 border-b">
          <div>
            <div className="text-sm text-muted-foreground">Home → Follow-up Reminders</div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Follow-up Reminders
            </h1>
          </div>
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
    );

  return (
    <div className="container mx-auto space-y-8 p-6 lg:p-8">
      <div className="flex items-center justify-between pb-6 border-b">
        <div>
          <div className="text-sm text-muted-foreground">Home → Follow-up Reminders</div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Follow-up Reminders
          </h1>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>New Reminder</Button>
          </DialogTrigger>
          <WideDialogContent size="xl">
            <DialogHeader>
              <DialogTitle>Create New Reminder</DialogTitle>
            </DialogHeader>
            <ReminderCreateForm onSuccess={() => setDialogOpen(false)} />
          </WideDialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Open Reminders"
          value={isLoading ? <Skeleton className="h-8 w-20" /> : openReminders.toLocaleString("de-DE")}
          icon={<Bell className="h-5 w-5 text-muted-foreground" />}
          className="border-none shadow-sm bg-card/90 hover:shadow-md"
          change="+8% from last month"
        />
        <StatCard
          title="Overdue Today"
          value={isLoading ? <Skeleton className="h-8 w-20" /> : overdue.toLocaleString("de-DE")}
          icon={<AlertTriangle className="h-5 w-5 text-muted-foreground" />}
          className="border-none shadow-sm bg-card/90 hover:shadow-md"
          change={overdue > 0 ? "Needs attention" : "All good"}
        />
        <StatCard
          title="This Week"
          value={isLoading ? <Skeleton className="h-8 w-20" /> : thisWeek.toLocaleString("de-DE")}
          icon={<Calendar className="h-5 w-5 text-muted-foreground" />}
          className="border-none shadow-sm bg-card/90 hover:shadow-md"
          change="+5% from last month"
        />
        <StatCard
          title="High Priority"
          value={isLoading ? <Skeleton className="h-8 w-20" /> : highPriority.toLocaleString("de-DE")}
          icon={<Star className="h-5 w-5 text-muted-foreground" />}
          className="border-none shadow-sm bg-card/90 hover:shadow-md"
          change="+12% from last month"
        />
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
          <WideDialogContent size="xl">
            <DialogHeader>
              <DialogTitle>Edit Reminder</DialogTitle>
            </DialogHeader>
            <ReminderEditForm reminder={editReminder} onSuccess={() => setEditReminder(null)} />
          </WideDialogContent>
        </Dialog>
      )}
    </div>
  );
}

// StatCard component
function StatCard({
  title,
  value,
  icon,
  className,
  change,
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  className?: string;
  change?: string;
}) {
  return (
    <Card
      className={cn(
        "bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 shadow-sm transition-all duration-200 hover:shadow-lg hover:shadow-primary/15 hover:bg-gradient-to-br hover:from-card hover:to-muted/50",
        className,
      )}
    >
      <div className="hover:brightness-105 transition-all">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className="rounded-full bg-muted/50 p-3 flex items-center justify-center">{icon}</div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold tracking-tight text-foreground">{value}</div>
          {change && <p className="text-xs text-green-600">{change}</p>}
        </CardContent>
      </div>
    </Card>
  );
}
