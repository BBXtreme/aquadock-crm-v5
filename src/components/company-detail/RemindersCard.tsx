// This component displays a timeline of events related to a specific company. It allows users to view, add, edit, and delete timeline entries. Each entry can be associated with a company, contact, and user. The component uses React Query for data fetching and mutations, and Supabase as the backend database. It also includes loading states and error handling with toast notifications.  - source:
"use client";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Bell, Edit, Plus, Trash } from "lucide-react";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import ReminderCreateForm from "@/components/features/reminder/ReminderCreateForm";
import ReminderEditForm from "@/components/features/reminder/ReminderEditForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingState } from "@/components/ui/LoadingState";
import { deleteReminderWithTrash, restoreReminderWithTrash } from "@/lib/actions/crm-trash";
import { useNumberLocaleTag, useT } from "@/lib/i18n/use-translations";
import { createClient } from "@/lib/supabase/browser";
import { safeDisplay } from "@/lib/utils";
import type { Reminder } from "@/types/database.types";

interface Props {
  companyId: string;
}

function priorityKey(p: string | null | undefined): "priorityHoch" | "priorityNormal" | "priorityNiedrig" {
  const v = p?.toLowerCase();
  if (v === "hoch") {
    return "priorityHoch";
  }
  if (v === "niedrig") {
    return "priorityNiedrig";
  }
  return "priorityNormal";
}

function reminderStatusKey(s: string | null | undefined): "filterOpen" | "filterClosed" {
  return s?.toLowerCase() === "closed" ? "filterClosed" : "filterOpen";
}

export default function RemindersCard({ companyId }: Props) {
  const t = useT("reminders");
  const tCommon = useT("common");
  const localeTag = useNumberLocaleTag();
  const [editReminder, setEditReminder] = useState<Reminder | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const formatDetailDate = (dateStr: string | null | undefined) => {
    if (!dateStr) {
      return tCommon("dash");
    }
    return new Date(dateStr).toLocaleDateString(localeTag, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const { data: user } = useSuspenseQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        console.warn("User not authenticated; reminder actions may be limited.");
        return null;  // <-- Change: Return null instead of throwing
      }
      return user;
    },
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

  const { data: reminders = [] } = useSuspenseQuery({
    queryKey: ["reminders", companyId],
    queryFn: async () => {
      const supabase = createClient();
      const userId = user?.id;  // <-- Add: Safe extraction of user.id
      let query = supabase
        .from("reminders")
        .select("*")
        .eq("company_id", companyId)
        .is("deleted_at", null);
      if (userId) {  // <-- Add: Only add .or if userId exists
        query = query.or(`user_id.eq.${userId},assigned_to.eq.${userId}`);
      }
      const { data, error } = await query.order("due_date", { ascending: true });
      if (error) throw error;

      return data;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteReminderWithTrash(id),
    onSuccess: (mode, id) => {
      queryClient.invalidateQueries({ queryKey: ["reminders", companyId] });
      queryClient.invalidateQueries({ queryKey: ["reminders-count-overdue"] });
      queryClient.invalidateQueries({ queryKey: ["reminders-count-this-week"] });
      if (mode === "soft") {
        toast.success(t("toastDeleted"), {
          action: {
            label: tCommon("undo"),
            onClick: () => {
              void restoreReminderWithTrash(id).then(() => {
                queryClient.invalidateQueries({ queryKey: ["reminders", companyId] });
                toast.success(t("toastUpdated"));
              });
            },
          },
        });
      } else {
        toast.success(t("toastDeleted"));
      }
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(t("toastDeleteFailed"), { description: message });
    },
  });

  const handleAdd = () => setAddDialogOpen(true);
  const handleEdit = (reminder: Reminder) => setEditReminder(reminder);
  const handleDelete = (id: string) => {
    if (confirm(t("deleteDescription"))) deleteMutation.mutate(id);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              {t("cardTitle", { count: reminders.length })}
            </CardTitle>
            <Button variant="outline" size="sm" type="button" onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              {t("newReminder")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<LoadingState count={5} />}>
            {reminders.length === 0 ? (
              <p className="text-muted-foreground">{t("detailEmptyCompany")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left">{t("detailColTitle")}</th>
                      <th className="text-left">{t("detailColDueDate")}</th>
                      <th className="text-left">{t("detailColPriority")}</th>
                      <th className="text-left">{t("detailColStatus")}</th>
                      <th className="text-left">{t("assignedTo")}</th>
                      <th className="text-right w-24">{t("detailColActions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reminders.map((reminder) => (
                      <tr key={reminder.id}>
                        <td className="font-medium">
                          <div>
                            <button
                              type="button"
                              className="text-primary hover:underline cursor-pointer"
                              onClick={() => handleEdit(reminder)}
                            >
                              {safeDisplay(reminder.title)}
                            </button>
                            {reminder.description && <div className="text-xs text-muted-foreground">{reminder.description}</div>}
                            <div className="text-xs text-muted-foreground">
                              {t("detailMetaLine", {
                                created: formatDetailDate(reminder.created_at),
                                updated: formatDetailDate(reminder.updated_at),
                              })}
                            </div>
                          </div>
                        </td>
                        <td>{formatDetailDate(reminder.due_date)}</td>
                        <td>
                          <Badge
                            className={
                              reminder.priority === "hoch"
                                ? "bg-orange-500 text-white"
                                : reminder.priority === "normal"
                                  ? "bg-blue-500 text-white"
                                  : "bg-muted text-foreground"
                            }
                          >
                            {t(priorityKey(reminder.priority))}
                          </Badge>
                        </td>
                        <td>
                          <Badge variant={reminder.status === "open" ? "default" : "secondary"}>
                            {t(reminderStatusKey(reminder.status))}
                          </Badge>
                        </td>
                        <td>{profiles.find(p => p.id === reminder.assigned_to)?.display_name || t("unassigned")}</td>
                        <td className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              type="button"
                              onClick={() => handleEdit(reminder)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive/90"
                              type="button"
                              onClick={() => handleDelete(reminder.id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Suspense>
        </CardContent>
      </Card>

      <Dialog open={!!editReminder} onOpenChange={() => setEditReminder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dialogEditTitle")}</DialogTitle>
          </DialogHeader>
          <ReminderEditForm
            key={editReminder?.id}
            reminder={editReminder}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["reminders", companyId] });
              queryClient.invalidateQueries({ queryKey: ["reminders-count-overdue"] });
              queryClient.invalidateQueries({ queryKey: ["reminders-count-this-week"] });
              toast.success(t("toastSaved"));
              setEditReminder(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dialogCreateTitle")}</DialogTitle>
          </DialogHeader>
          <ReminderCreateForm
            preselectedCompanyId={companyId}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["reminders", companyId] });
              queryClient.invalidateQueries({ queryKey: ["reminders-count-overdue"] });
              queryClient.invalidateQueries({ queryKey: ["reminders-count-this-week"] });
              toast.success(t("toastSaved"));
              setAddDialogOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
