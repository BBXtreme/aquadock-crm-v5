"use client";

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { endOfWeek, startOfWeek } from "date-fns";
import { AlertTriangle, Calendar, CheckCircle, FileText, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import ReminderCreateForm from "@/components/features/reminder/ReminderCreateForm";
import ReminderEditForm from "@/components/features/reminder/ReminderEditForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingState } from "@/components/ui/LoadingState";
import { StatCard } from "@/components/ui/StatCard";
import { WideDialogContent } from "@/components/ui/wide-dialog";
import { deleteReminderWithTrash, restoreReminderWithTrash } from "@/lib/actions/crm-trash";
import { getCurrentUserClient } from "@/lib/auth/get-current-user-client";
import { useNumberLocaleTag, useT } from "@/lib/i18n/use-translations";
import { createClient } from "@/lib/supabase/browser";
import type { Reminder } from "@/types/database.types";

type ReminderWithCompany = Reminder & {
  companies: { firmenname: string } | null;
};

function ClientRemindersPage() {
  const t = useT("reminders");
  const router = useRouter();
  const localeTag = useNumberLocaleTag();
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

  const trashedReminderRedirect = searchParams.get("trashedReminder") === "1";

  useEffect(() => {
    if (!trashedReminderRedirect) {
      return;
    }
    toast.message(t("toastTrashedReminder"));
    router.replace("/reminders", { scroll: false });
  }, [trashedReminderRedirect, router, t]);

  const { data: user } = useSuspenseQuery({
    queryKey: ["user"],
    queryFn: getCurrentUserClient,
  });

  const { data: reminders = [] } = useSuspenseQuery({
    queryKey: ["reminders"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("reminders")
        .select("*, companies(firmenname)")
        .is("deleted_at", null)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ReminderWithCompany[];
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const { data: profiles = [] } = useSuspenseQuery({
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
    mutationFn: async (id: string) => deleteReminderWithTrash(id),
    onSuccess: (mode, id) => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({ queryKey: ["reminders-count-overdue"] });
      queryClient.invalidateQueries({ queryKey: ["reminders-count-this-week"] });
      if (mode === "soft") {
        toast.success(t("toastDeleted"), {
          action: {
            label: "Rückgängig",
            onClick: () => {
              void restoreReminderWithTrash(id).then(() => {
                queryClient.invalidateQueries({ queryKey: ["reminders"] });
                toast.success(t("toastUpdated"));
              });
            },
          },
        });
      } else {
        toast.success(t("toastDeleted"));
      }
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : t("unknownError");
      toast.error(t("toastDeleteFailed"), { description: message });
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

  return (
    <Suspense fallback={<LoadingState count={20} />}>
      <div className="flex items-center justify-between pb-6 border-b">
        <div>
          <div className="text-sm text-muted-foreground">{t("breadcrumb")}</div>
          <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            {t("title")}
          </h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={() => setReminderDialogOpen(true)}>{t("newReminder")}</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-6">
        <StatCard title={t("statTotal")} value={stats.total.toString()} icon={<FileText className="h-4 w-4" />} />
        <StatCard title={t("statOpen")} value={stats.open.toString()} icon={<CheckCircle className="h-4 w-4" />} />
        <StatCard
          title={t("statOverdue")}
          value={<span className={stats.overdue > 0 ? "text-destructive" : ""}>{stats.overdue.toString()}</span>}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <StatCard title={t("statThisWeek")} value={stats.thisWeek.toString()} icon={<Calendar className="h-4 w-4" />} />
      </div>

      <div className="flex items-center gap-2 pb-4">
        <Button
          variant={statusFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => handleFilterChange("all")}
        >
          {t("filterAll")}
        </Button>
        <Button
          variant={statusFilter === "open" ? "default" : "outline"}
          size="sm"
          onClick={() => handleFilterChange("open")}
        >
          {t("filterOpen")}
        </Button>
        <Button
          variant={statusFilter === "overdue" ? "default" : "outline"}
          size="sm"
          onClick={() => handleFilterChange("overdue")}
        >
          {t("filterOverdue")}
        </Button>
        <Button
          variant={statusFilter === "closed" ? "default" : "outline"}
          size="sm"
          onClick={() => handleFilterChange("closed")}
        >
          {t("filterClosed")}
        </Button>
        <Button
          variant={statusFilter === "my" ? "default" : "outline"}
          size="sm"
          onClick={() => handleFilterChange("my")}
        >
          {t("filterMy")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("cardTitle", { count: filteredReminders.length })}</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReminders.length === 0 ? (
            <p className="text-muted-foreground">{t("empty")}</p>
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
                              ? "bg-warning text-warning-foreground"
                              : reminder.priority === "normal"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                          }
                        >
                          {reminder.priority === "hoch"
                            ? t("priorityHoch")
                            : reminder.priority === "normal"
                              ? t("priorityNormal")
                              : reminder.priority === "niedrig"
                                ? t("priorityNiedrig")
                                : reminder.priority}
                        </Badge>
                        <Badge variant={reminder.status === "open" ? "default" : "secondary"}>
                          {reminder.status === "open"
                            ? t("statusOpen")
                            : reminder.status === "closed"
                              ? t("statusClosed")
                              : reminder.status}
                        </Badge>
                      </div>
                      {reminder.description && (
                        <p className="text-sm text-muted-foreground mb-2">{reminder.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          {t("due")}: {new Date(reminder.due_date).toLocaleDateString(localeTag)}
                        </span>
                        <span>
                          {t("assignedTo")}:{" "}
                          {profiles.find((p) => p.id === reminder.assigned_to)?.display_name || t("unassigned")}
                        </span>
                        <span>
                          {t("company")}:{" "}
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
            <DialogTitle>{editReminder ? t("dialogEditTitle") : t("dialogCreateTitle")}</DialogTitle>
            <DialogDescription>
              {editReminder ? t("dialogEditDescription") : t("dialogCreateDescription")}
            </DialogDescription>
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
            <DialogTitle>{t("deleteTitle")}</DialogTitle>
            <DialogDescription>{t("deleteDescription")}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t("cancel")}
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
              {t("delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Suspense>
  );
}

export default ClientRemindersPage;
