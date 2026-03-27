"use client";
import { Calendar, Edit, Plus, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TimelineEntryWithJoins } from "@/lib/supabase/database.types";

interface Props {
  timeline?: TimelineEntryWithJoins[];
  onAdd: () => void;
  onEdit: (entry: TimelineEntryWithJoins) => void;
  onDelete: (id: string) => void;
}

export default function TimelineCard({ timeline = [], onAdd, onEdit, onDelete }: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Timeline ({timeline.length})
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-2" />
            New Timeline
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {timeline.length === 0 ? (
          <p className="text-gray-500">No timeline entries for this company.</p>
        ) : (
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
                      ? new Date(entry.created_at).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })
                      : "—"}
                  </td>
                  <td>
                    {entry.title} ({entry.activity_type})
                  </td>
                  <td>{entry.companies?.firmenname || "—"}</td>
                  <td>{entry.contacts ? `${entry.contacts.vorname} ${entry.contacts.nachname}` : "—"}</td>
                  <td>{entry.user_name || "—"}</td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(entry)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700"
                        onClick={() => onDelete(entry.id)}
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
