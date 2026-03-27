"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import ReminderEditForm from "@/components/features/ReminderEditForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SkeletonList } from "@/components/ui/SkeletonList";
import { WideDialogContent } from "@/components/ui/wide-dialog";
import { createClient } from "@/lib/supabase/browser";
import type { Reminder } from "@/lib/supabase/database.types";

export default function RemindersPage() {
  const queryClient = useQueryClient();
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [editReminder, setEditReminder] = useState<Reminder | null>(null);

  const {
    data: reminders = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["reminders"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("reminders").select("*").order("due_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

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
      toast.error("Failed to delete reminder", { description: error.message });
    },
  });

  const handleEdit = useCallback((reminder: Reminder) => {
    setEditReminder(reminder);
    setReminderDialogOpen(true);
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-8 p-6 lg:p-8">
        <div className="flex items-center justify-between pb-6 border-b">
          <div>
            <div className="text-sm text-muted-foreground">Home → Reminders</div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Reminders
            </h1>
          </div>
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
  }

  if (error) {
    return (
      <div className="container mx-auto space-y-8 p-6 lg:p-8">
        <div className="flex items-center justify-between pb-6 border-b">
          <div>
            <div className="text-sm text-muted-foreground">Home → Reminders</div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Reminders
            </h1>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Error loading reminders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-8 p-6 lg:p-8">
      <div className="flex items-center justify-between pb-6 border-b">
        <div>
          <div className="text-sm text-muted-foreground">Home → Reminders</div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Reminders
          </h1>
        </div>
        <Button onClick={() => setReminderDialogOpen(true)}>New Reminder</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reminders ({reminders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {reminders.length === 0 ? (
            <p className="text-muted-foreground">No reminders yet.</p>
          ) : (
            <div className="space-y-4">
              {reminders.map((reminder) => (
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
                        <span>Assigned to: {reminder.assigned_to || "Unassigned"}</span>
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
                          if (confirm("Delete this reminder?")) {
                            deleteMutation.mutate(reminder.id);
                          }
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
      <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
        <WideDialogContent size="xl">
          <DialogHeader>
            <DialogTitle>{editReminder ? "Edit Reminder" : "Create New Reminder"}</DialogTitle>
            <DialogDescription>{editReminder ? "Edit the reminder." : "Add a new reminder."}</DialogDescription>
          </DialogHeader>
          <ReminderEditForm
            reminder={editReminder}
            onSuccess={() => {
              setReminderDialogOpen(false);
              setEditReminder(null);
              queryClient.invalidateQueries({ queryKey: ["reminders"] });
            }}
          />
        </WideDialogContent>
      </Dialog>
    </div>
  );
}
