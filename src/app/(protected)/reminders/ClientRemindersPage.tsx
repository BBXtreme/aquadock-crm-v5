"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endOfWeek, startOfWeek } from "date-fns";
import { AlertTriangle, Calendar, CheckCircle, FileText, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import ReminderCreateForm from "@/components/features/reminder/ReminderCreateForm";
import ReminderEditForm from "@/components/features/reminder/ReminderEditForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatCard } from "@/components/ui/StatCard";
import { WideDialogContent } from "@/components/ui/wide-dialog";
import type { UserRole } from "@/lib/auth/types";
import { createClient } from "@/lib/supabase/browser";
import type { Reminder } from "@/types/database.types";

type ReminderWithCompany = Reminder & {
  companies: { firmenname: string } | null;
};

function ClientRemindersPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [editReminder, setEditReminder] = useState<Reminder | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reminderToDelete, setReminderToDelete] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "overdue" | "closed" | "my">(() => {
    const status = searchParams.get("status");
    if (status === "open" || status === "overdue" || status === "closed" || status === "my") return status;
    return "all";
  });

  const { data: user, error: userError } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return null;
      return {
        id: user.id,
        email: user.email || null,
        user_metadata: user.user_metadata,
        role: (user.user_metadata?.role as UserRole) || "user",
        display_name: user.user_metadata?.display_name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
      };
    },
  });

  const {
    data: reminders = [] as ReminderWithCompany[],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["reminders"],
    queryFn: async () => {
      if (!user) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from("reminders")
        .select("*, companies(firmenname)")
        .or(`user_id.eq.${user.id},assigned_to.eq.${user.id}`)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ReminderWithCompany[];
    },
    enabled: !!user,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("profiles").select("id, display_name");
      if (error) throw error;
      return data;
    },
  });

  const stats = useMemo(() => {
    const total = reminders.length;
    const open = reminders.filter((r) => r.status === "open").length;
    const overdue = reminders.filter((r) => r.status === "open" && new Date(r.due_date) < new Date()).length;
    const thisWeek = reminders.filter((r) => {
      const due = new Date(r.due_date);
      const start = startOfWeek(new Date(), { weekStartsOn: 1 });
      const end = endOfWeek(new Date(), { weekStartsOn: 1 });
      return due >= start && due <= end;
    }).length;
    return { total, open, overdue, thisWeek };
  }, [reminders]);

  const filteredReminders = useMemo(() => {
    if (statusFilter === "all") return reminders;
    if (statusFilter === "open") return reminders.filter((r) => r.status === "open");
    if (statusFilter === "closed") return reminders.filter((r) => r.status === "closed");
    if (statusFilter === "overdue")
      return reminders.filter((r) => r.status === "open" && new Date(r.due_date) < new Date());
    if (statusFilter === "my") return reminders.filter((r) => r.assigned_to === user?.id);
    return reminders;
  }, [reminders, statusFilter, user?.id]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("reminders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      toast.success("Reminder deleted");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error("Failed to delete reminder", { description: message });
    },
  });

  const handleEdit = useCallback((reminder: Reminder) => {
    setEditReminder(reminder);
  }, []);

  const handleFilterChange = (filter: "all" | "open" | "overdue" | "closed" | "my") => {
    setStatusFilter(filter);
  };

  useEffect(() => {
    if (searchParams.get("create") === "true") {
      setReminderDialogOpen(true);
    }
  }, [searchParams]);

  if (userError) {
    return (
      <div className="flex items-center justify-between pb-6 border-b">
        <div>
          <div className="text-sm text-muted-foreground">Home → Reminders</div>
          <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Reminders
          </h1>
          <p className="text-red-600">Error loading user data. Please try again.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-between pb-6 border-b">
        <div>
          <div className="text-sm text-muted-foreground">Home → Reminders</div>
          <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Reminders
          </h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-between pb-6 border-b">
        <div>
          <div className="text-sm text-muted-foreground">Home → Reminders</div>
          <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Reminders
          </h1>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between pb-6 border-b">
        <div>
          <div className="text-sm text-muted-foreground">Home → Reminders</div>
          <h1 className="text-3xl font-bold tracking-tight">
            Reminders
          </h1>
        </div>
        <Button onClick={() => setReminderDialogOpen(true)}>New Reminder</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-6">
        <StatCard title="Total Reminders" value={stats.total.toString()} icon={<FileText className="h-4 w-4" />} />
        <StatCard title="Open Reminders" value={stats.open.toString()} icon={<CheckCircle className="h-4 w-4" />} />
        <StatCard
          title="Overdue Reminders"
          value={<span className={stats.overdue > 0 ? "text-red-600" : ""}>{stats.overdue.toString()}</span>}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <StatCard title="This Week" value={stats.thisWeek.toString()} icon={<Calendar className="h-4 w-4" />} />
      </div>

      <div className="flex items-center gap-2 pb-4">
        <Button
          variant={statusFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => handleFilterChange("all")}
        >
          All
        </Button>
        <Button
          variant={statusFilter === "open" ? "default" : "outline"}
          size="sm"
          onClick={() => handleFilterChange("open")}
        >
          Open
        </Button>
        <Button
          variant={statusFilter === "overdue" ? "default" : "outline"}
          size="sm"
          onClick={() => handleFilterChange("overdue")}
        >
          Overdue
        </Button>
        <Button
          variant={statusFilter === "closed" ? "default" : "outline"}
          size="sm"
          onClick={() => handleFilterChange("closed")}
        >
          Closed
        </Button>
        <Button
          variant={statusFilter === "my" ? "default" : "outline"}
          size="sm"
          onClick={() => handleFilterChange("my")}
        >
          My Tasks
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reminders ({filteredReminders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReminders.length === 0 ? (
            <p className="text-muted-foreground">No reminders yet.</p>
          ) : (
            <div className="space-y-4">
              {filteredReminders.map((reminder) => (
                <div key={reminder.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{reminder.title}</h3>
                        <Badge
                          className={
                            reminder.priority === "hoch"
                              ? "bg-orange-500 text-white"
                              : reminder.priority === "normal"
                                ? "bg-blue-500 text-white"
                                : "bg-gray-500 text-white"
                          }
                        >
                          {reminder.priority}
                        </Badge>
                        <Badge variant={reminder.status === "open" ? "default" : "secondary"}>{reminder.status}</Badge>
                      </div>
                      {reminder.description && (
                        <p className="text-sm text-muted-foreground mb-2">{reminder.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Due: {new Date(reminder.due_date).toLocaleDateString()}</span>
                        <span>Assigned to: {profiles.find(p => p.id === reminder.assigned_to)?.display_name || "Unassigned"}</span>
                        <span>
                          Company:{" "}
                          <Link href={`/companies/${reminder.company_id}`}>{reminder.companies?.firmenname}</Link>
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(reminder)} type="button">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setReminderToDelete(reminder.id);
                          setDeleteDialogOpen(true);
                        }}
                        disabled={deleteMutation.isPending}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reminder Dialog */}
      <Dialog open={reminderDialogOpen || !!editReminder} onOpenChange={() => {
        setReminderDialogOpen(false);
        setEditReminder(null);
      }}>
        <WideDialogContent size="xl">
          <DialogHeader>
            <DialogTitle>{editReminder ? "Edit Reminder" : "Create New Reminder"}</DialogTitle>
            <DialogDescription>{editReminder ? "Edit the reminder." : "Add a new reminder."}</DialogDescription>
          </DialogHeader>
          {editReminder ? (
            <ReminderEditForm
              reminder={editReminder}
              onSuccess={() => {
                setReminderDialogOpen(false);
                setEditReminder(null);
                queryClient.invalidateQueries({ queryKey: ["reminders"] });
              }}
            />
          ) : (
            <ReminderCreateForm onSuccess={() => setReminderDialogOpen(false)} />
          )}
        </WideDialogContent>
      </Dialog>
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Reminder</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this reminder? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (reminderToDelete) {
                  deleteMutation.mutate(reminderToDelete);
                  setDeleteDialogOpen(false);
                  setReminderToDelete(null);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ClientRemindersPage;
