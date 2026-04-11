// src/components/company-detail/TimelineCard.tsx
"use client";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Bell, Calendar, Edit, FileText, Mail, MoreHorizontal, Phone, Plus, Trash } from "lucide-react";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import TimelineEntryForm from "@/components/features/timeline/TimelineEntryForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingState } from "@/components/ui/LoadingState";
import { deleteTimelineEntryWithTrash, restoreTimelineEntryWithTrash } from "@/lib/actions/crm-trash";
import { getCurrentUserClient } from "@/lib/auth/get-current-user-client";
import { TIMELINE_DELETE_NO_ACTIVE_ROW } from "@/lib/constants/timeline-delete";
import { useNumberLocaleTag, useT } from "@/lib/i18n/use-translations";
import { createClient } from "@/lib/supabase/browser";
import type { TimelineEntryWithJoins } from "@/types/database.types";

interface Props {
  companyId: string;
}

export default function TimelineCard({ companyId }: Props) {
  const t = useT("timeline");
  const tCommon = useT("common");
  const localeTag = useNumberLocaleTag();

  const activityLabel = (activityType: string) => {
    switch (activityType) {
      case "note":
        return t("activityNote");
      case "call":
        return t("activityCall");
      case "email":
        return t("activityEmail");
      case "meeting":
        return t("activityMeeting");
      case "reminder":
        return t("activityReminder");
      default:
        return t("activityOther");
    }
  };
  const [editEntry, setEditEntry] = useState<TimelineEntryWithJoins | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const getIcon = (activityType: string) => {
    switch (activityType) {
      case "note": return <FileText className="h-4 w-4" />;
      case "call": return <Phone className="h-4 w-4" />;
      case "email": return <Mail className="h-4 w-4" />;
      case "meeting": return <Calendar className="h-4 w-4" />;
      case "reminder": return <Bell className="h-4 w-4" />;
      default: return <MoreHorizontal className="h-4 w-4" />;
    }
  };

  const getVariant = (activityType: string) => {
    switch (activityType) {
      case "note": return "default";
      case "call": return "secondary";
      case "email": return "outline";
      case "meeting": return "destructive";
      case "reminder": return "secondary";
      default: return "outline";
    }
  };

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const user = await getCurrentUserClient();
      if (!user) {
        console.warn("User not authenticated; timeline actions may be limited.");
        return null; // Return null instead of throwing
      }
      return user;
    },
  });

  const { data: timeline = [] } = useSuspenseQuery({
    queryKey: ["timeline", companyId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("timeline")
        .select("*, companies!company_id(firmenname), contacts!contact_id(vorname,nachname,position), profiles!created_by(display_name)")
        .eq("company_id", companyId)
        .is("deleted_at", null);
      if (error) throw error;
      return data as TimelineEntryWithJoins[];
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("companies")
        .select("id, firmenname, kundentyp")
        .is("deleted_at", null);
      if (error) throw error;
      return data;
    },
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("contacts")
        .select("id, vorname, nachname, position, email, telefon")
        .is("deleted_at", null);
      if (error) throw error;
      return data;
    },
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteTimelineEntryWithTrash(id),
    onSuccess: (mode, id) => {
      queryClient.invalidateQueries({ queryKey: ["timeline", companyId] });
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      if (mode === "soft") {
        toast.success(t("toastDeleted"), {
          action: {
            label: tCommon("undo"),
            onClick: () => {
              void restoreTimelineEntryWithTrash(id).then(() => {
                queryClient.invalidateQueries({ queryKey: ["timeline", companyId] });
                queryClient.invalidateQueries({ queryKey: ["timeline"] });
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
      if (err instanceof Error && err.message === TIMELINE_DELETE_NO_ACTIVE_ROW) {
        toast.error(t("toastDeleteAlreadyTrashedTitle"), {
          description: t("toastDeleteAlreadyTrashedDescription"),
        });
        return;
      }
      const message = err instanceof Error ? err.message : t("unknownError");
      toast.error(t("toastDeleteFailed"), { description: message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<TimelineEntryWithJoins>) => {
      if (!user) throw new Error("User not authenticated");
      const supabase = createClient();
      const { error } = await supabase.from("timeline").update({ ...data, updated_by: user.id }).eq("id", editEntry?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline", companyId] });
      queryClient.refetchQueries({ queryKey: ["timeline", companyId] });
      toast.success(t("toastUpdated"));
      setEditEntry(null);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : t("unknownError");
      toast.error(t("toastUpdateFailed"), { description: message });
    },
  });

  const createTimelineMutation = useMutation({
    mutationFn: async (data: Partial<TimelineEntryWithJoins>) => {
      if (!user) throw new Error("User not authenticated");
      const supabase = createClient();
      const { error } = await supabase.from("timeline").insert({ ...data, created_by: user.id, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline", companyId] });
      toast.success(t("toastCreated"));
      setAddDialogOpen(false);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : t("unknownError");
      console.error("Error creating timeline entry:", err);
      toast.error(t("toastCreateFailed"), { description: message });
    },
  });

  const handleAdd = () => {
    setAddDialogOpen(true);
  };

  const handleEdit = (entry: TimelineEntryWithJoins) => {
    setEditEntry(entry);
  };

  const handleDelete = (id: string) => {
    if (confirm(t("deleteConfirmDescription"))) {
      deleteMutation.mutate(id);
    }
  };

  const handleUpdate = async (values: Partial<TimelineEntryWithJoins>) => {
    await updateMutation.mutateAsync(values);
  };

  const handleTimelineSubmit = async (values: Partial<TimelineEntryWithJoins>) => {
    setIsSubmitting(true);
    try {
      await createTimelineMutation.mutateAsync(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {t("detailCardTitle", { count: timeline.length })}
            </CardTitle>
            <Button variant="outline" size="sm" type="button" onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              {t("detailNewEntry")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<LoadingState count={5} />}>
            {timeline.length === 0 ? (
              <p className="text-muted-foreground">{t("detailEmptyCompany")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left">{t("colDateTime")}</th>
                      <th className="text-left">{t("colActivity")}</th>
                      <th className="text-left">{t("formTitleLabel")}</th>
                      <th className="text-left">{t("colCompany")}</th>
                      <th className="text-left">{t("colContact")}</th>
                      <th className="text-left">{t("colUser")}</th>
                      <th className="text-right">{t("colActions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeline.map((entry) => (
                      <tr key={entry.id}>
                        <td>
                          {entry.created_at
                            ? new Date(entry.created_at).toLocaleString(localeTag, {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })
                            : tCommon("dash")}
                        </td>
                        <td>
                          <Badge variant={getVariant(entry.activity_type)} className="flex items-center gap-1">
                            {getIcon(entry.activity_type)}
                            {activityLabel(entry.activity_type)}
                          </Badge>
                        </td>
                        <td>{entry.title}</td>
                        <td>{entry.companies?.firmenname || tCommon("dash")}</td>
                        <td>{entry.contacts ? `${entry.contacts.vorname} ${entry.contacts.nachname}` : tCommon("dash")}</td>
                        <td>{profiles.find(p => p.id === entry.created_by)?.display_name || tCommon("dash")}</td>
                        <td className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              type="button"
                              onClick={() => handleEdit(entry)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive/90"
                              type="button"
                              onClick={() => handleDelete(entry.id)}
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

      <Dialog open={!!editEntry} onOpenChange={() => setEditEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editDialogTitle")}</DialogTitle>
          </DialogHeader>
          <TimelineEntryForm
            key={editEntry?.id}
            editEntry={editEntry}
            onSubmit={handleUpdate}
            isSubmitting={updateMutation.isPending}
            companies={companies}
            contacts={contacts}
            onCancel={() => setEditEntry(null)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("createDialogTitle")}</DialogTitle>
          </DialogHeader>
          <TimelineEntryForm
            onSubmit={handleTimelineSubmit}
            isSubmitting={isSubmitting}
            companies={companies}
            contacts={contacts}
            preselectedCompanyId={companyId}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
