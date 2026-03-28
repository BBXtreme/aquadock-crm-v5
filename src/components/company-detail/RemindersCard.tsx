// This component displays a timeline of events related to a specific company. It allows users to view, add, edit, and delete timeline entries. Each entry can be associated with a company, contact, and user. The component uses React Query for data fetching and mutations, and Supabase as the backend database. It also includes loading states and error handling with toast notifications.  - source:
"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Edit, Plus, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import ReminderEditForm from "@/components/features/ReminderEditForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/browser";
import type { Reminder } from "@/lib/supabase/database.types";
import { formatDateDE, getPriorityLabel, getReminderStatusLabel, safeDisplay } from "@/lib/utils";

interface Props {
  companyId: string;
}

export default function RemindersCard({ companyId }: Props) {
  const [editReminder, setEditReminder] = useState<Reminder | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  console.log("RemindersCard companyId:", companyId);

  const {
    data: reminders = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["reminders", companyId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .eq("company_id", companyId)
        .order("due_date", { ascending: true });

      if (error) throw error;

      console.log("🔍 RemindersCard - RAW data from Supabase for company", companyId);
      console.table(data);
      if (data && data.length > 0) {
        console.log("📋 First reminder full object:", data[0]);
      }
      return data;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 30000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("reminders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders", companyId] });
      queryClient.invalidateQueries({ queryKey: ["contacts", companyId] });
      toast.success("Reminder deleted");
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error("Delete failed", { description: message });
    },
  });

  const handleAdd = () => setAddDialogOpen(true);
  const handleEdit = (reminder: Reminder) => setEditReminder(reminder);
  const handleDelete = (id: string) => {
    if (confirm("Delete this reminder?")) deleteMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Reminders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500">Loading reminders...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Reminders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">Error loading reminders: {(error as Error).message}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Reminders ({reminders.length})
            </CardTitle>
            <Button variant="outline" size="sm" type="button" onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Reminder
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {reminders.length === 0 ? (
            <p className="text-gray-500">No reminders for this company.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left">Title</th>
                  <th className="text-left">Due Date</th>
                  <th className="text-left">Priority</th>
                  <th className="text-left">Status</th>
                  <th className="text-left">Assigned To</th>
                  <th className="text-right w-24">Actions</th>
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
                        {reminder.description && <div className="text-xs text-gray-500">{reminder.description}</div>}
                      </div>
                    </td>
                    <td>{formatDateDE(reminder.due_date)}</td>
                    <td>
                      <Badge
                        className={
                          reminder.priority === "hoch"
                            ? "bg-orange-500 text-white"
                            : reminder.priority === "normal"
                              ? "bg-blue-500 text-white"
                              : "bg-gray-500 text-white"
                        }
                      >
                        {getPriorityLabel(reminder.priority)}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={reminder.status === "open" ? "default" : "secondary"}>
                        {getReminderStatusLabel(reminder.status)}
                      </Badge>
                    </td>
                    <td>{reminder.assigned_to || "—"}</td>
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
                          className="h-8 w-8 text-red-600 hover:text-red-700"
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
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editReminder} onOpenChange={() => setEditReminder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Reminder</DialogTitle>
          </DialogHeader>
          <ReminderEditForm
            key={editReminder?.id}
            reminder={editReminder}
            onSuccess={() => {
              setEditReminder(null);
              queryClient.invalidateQueries({ queryKey: ["reminders", companyId] });
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Reminder</DialogTitle>
          </DialogHeader>
          <ReminderEditForm
            reminder={null}
            onSuccess={() => {
              setAddDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ["reminders", companyId] });
            }}
            preselectedCompanyId={companyId}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
