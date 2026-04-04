// src/components/company-detail/TimelineCard.tsx
"use client";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Calendar, Edit, Plus, Trash } from "lucide-react";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import TimelineEntryForm from "@/components/features/timeline/TimelineEntryForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingState } from "@/components/ui/LoadingState";
import { createClient } from "@/lib/supabase/browser";
import type { TimelineEntryWithJoins } from "@/types/database.types";

interface Props {
  companyId: string;
}

export default function TimelineCard({ companyId }: Props) {
  const [editEntry, setEditEntry] = useState<TimelineEntryWithJoins | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { data: timeline = [] } = useSuspenseQuery({
    queryKey: ["timeline", companyId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("timeline")
        .select("*, companies!company_id(firmenname), contacts!contact_id(vorname,nachname,position), profiles!created_by(display_name)")
        .eq("company_id", companyId);
      if (error) throw error;
      return data as TimelineEntryWithJoins[];
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("companies").select("id, firmenname, kundentyp");
      if (error) throw error;
      return data;
    },
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("contacts").select("id, vorname, nachname, position, email, telefon");
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("timeline").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline", companyId] });
      toast.success("Timeline entry deleted");
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error("Delete failed", { description: message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<TimelineEntryWithJoins>) => {
      const supabase = createClient();
      const { error } = await supabase.from("timeline").update(data).eq("id", editEntry?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline", companyId] });
      toast.success("Timeline entry updated");
      setEditEntry(null);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error("Update failed", { description: message });
    },
  });

  const createTimelineMutation = useMutation({
    mutationFn: async (data: Partial<TimelineEntryWithJoins>) => {
      const supabase = createClient();
      const { error } = await supabase.from("timeline").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline", companyId] });
      setAddDialogOpen(false);
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Error creating timeline entry:", err);
      toast.error("Create failed", { description: message });
    },
  });

  const handleAdd = () => {
    setAddDialogOpen(true);
  };

  const handleEdit = (entry: TimelineEntryWithJoins) => {
    setEditEntry(entry);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this timeline entry?")) {
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
              Timeline ({timeline.length})
            </CardTitle>
            <Button variant="outline" size="sm" type="button" onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              New Timeline
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<LoadingState count={5} />}>
            {timeline.length === 0 ? (
              <p className="text-gray-500">No timeline entries for this company.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left">Date</th>
                      <th className="text-left">Event</th>
                      <th className="text-left">Company</th>
                      <th className="text-left">Contact</th>
                      <th className="text-left">User</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeline.map((entry) => (
                      <tr key={entry.id}>
                        <td>
                          {entry.created_at
                            ? new Date(entry.created_at).toLocaleString("de-DE", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })
                            : "—"}
                        </td>
                        <td>
                          {entry.title} ({entry.activity_type})
                        </td>
                        <td>{entry.companies?.firmenname || "—"}</td>
                        <td>{entry.contacts ? `${entry.contacts.vorname} ${entry.contacts.nachname}` : "—"}</td>
                        <td>{entry.profiles?.display_name || entry.user_name || "—"}</td>
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
                              className="h-8 w-8 text-red-600 hover:text-red-700"
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
            <DialogTitle>Edit Timeline Entry</DialogTitle>
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
            <DialogTitle>Add Timeline Entry</DialogTitle>
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
