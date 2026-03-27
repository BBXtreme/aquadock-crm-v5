"use client";
import { Bell, Edit, Plus, Trash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Database } from "@/lib/supabase/database.types";

interface Props {
  reminders?: Database["public"]["Tables"]["reminders"]["Row"][];
  onAdd: () => void;
  onEdit: (reminder: any) => void;
  onDelete: (id: string) => void;
}

export default function RemindersCard({ reminders = [], onAdd, onEdit, onDelete }: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Reminders ({reminders.length})
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onAdd}>
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
                    <button
                      type="button"
                      className="text-primary hover:underline cursor-pointer"
                      onClick={() => onEdit(reminder)}
                    >
                      {reminder.title}
                    </button>
                  </td>
                  <td>{new Date(reminder.due_date).toLocaleDateString()}</td>
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
                      {reminder.priority}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant={reminder.status === "open" ? "default" : "secondary"}>{reminder.status}</Badge>
                  </td>
                  <td>{reminder.assigned_to || "—"}</td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(reminder)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700"
                        onClick={() => onDelete(reminder.id)}
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
  );
}
