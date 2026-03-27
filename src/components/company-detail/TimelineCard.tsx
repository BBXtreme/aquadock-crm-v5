"use client";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Edit, Plus, Trash } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/browser";
import type { TimelineEntryWithJoins } from "@/lib/supabase/database.types";

interface Props {
  companyId: string;
}

export default function TimelineCard({ companyId }: Props) {
  const [editEntry, setEditEntry] = useState<TimelineEntryWithJoins | null>(null);
  const { data: timeline = [] } = useQuery({
    queryKey: ["timeline", companyId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("timeline")
        .select("*, companies!company_id(firmenname), contacts!contact_id(vorname,nachname,position)")
        .eq("company_id", companyId);
      if (error) throw error;
      return data as TimelineEntryWithJoins[];
    },
  });

  const handleAdd = () => {
    // TODO: implement add timeline entry
    console.log("Add timeline entry");
  };

  const handleEdit = (entry: TimelineEntryWithJoins) => {
    setEditEntry(entry);
  };

  const handleDelete = (id: string) => {
    // TODO: implement delete timeline entry
    console.log("Delete timeline entry", id);
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
            <Button variant="outline" size="sm" onClick={handleAdd}>
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
                    <td>{entry.user_name || "—"}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(entry)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700"
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
          )}
        </CardContent>
      </Card>
      <Dialog open={!!editEntry} onOpenChange={() => setEditEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Timeline Entry</DialogTitle>
          </DialogHeader>
          <p>Edit timeline entry form not implemented yet.</p>
          <Button onClick={() => setEditEntry(null)}>Close</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
