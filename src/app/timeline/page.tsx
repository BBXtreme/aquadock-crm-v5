"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Bell, Building, Calendar, Edit, Mail, MessageSquare, MoreHorizontal, Phone, Trash, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import TimelineEntryForm from "@/components/features/TimelineEntryForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SkeletonList } from "@/components/ui/SkeletonList";
import { WideDialogContent } from "@/components/ui/wide-dialog";
import { createClient } from "@/lib/supabase/browser";
import type { Company, Contact, TimelineEntry } from "@/lib/supabase/database.types";

type TimelineEntryWithJoins = TimelineEntry & {
  companies?: Pick<Company, "firmenname"> | null;
  contacts?: Pick<Contact, "vorname" | "nachname" | "position"> | null;
};

export default function TimelinePage() {
  const queryClient = useQueryClient();
  const _router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<TimelineEntryWithJoins | null>(null);

  const {
    data: timeline = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["timeline"],
    queryFn: async () => {
      const response = await fetch("/api/timeline");
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      return response.json() as Promise<TimelineEntryWithJoins[]>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("companies")
        .select("id, firmenname, kundentyp")
        .order("firmenname", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Company[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("contacts")
        .select("id, vorname, nachname, email, telefon, position")
        .order("nachname")
        .order("vorname")
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: async (values: {
      title: string;
      content?: string;
      company_id?: string | null;
      contact_id?: string | null;
      activity_type?: string;
      user_name?: string;
    }) => {
      const payload = {
        title: values.title.trim() || "Untitled entry",
        content: values.content?.trim() || null,
        activity_type: values.activity_type || "note",
        company_id: values.company_id || null,
        contact_id: values.contact_id === "none" || !values.contact_id ? null : values.contact_id,
        user_name: values.user_name?.trim() || "BangLee",
        user_id: "fbd4cb43-1ff7-447b-bb56-d083bdc22bf7",
      };

      const res = await fetch("/api/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.details || `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      setDialogOpen(false);
      toast.success("Eintrag erstellt");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      toast.error("Erstellen fehlgeschlagen", { description: message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: {
        title: string;
        content?: string;
        company_id?: string | null;
        contact_id?: string | null;
        activity_type?: string;
        user_name?: string;
      };
    }) => {
      const res = await fetch(`/api/timeline/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      setDialogOpen(false);
      setEditEntry(null);
      toast.success("Entry updated");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      toast.error("Update failed", { description: message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/timeline/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["timeline"] });
      const previous = queryClient.getQueryData<TimelineEntryWithJoins[]>(["timeline"]);
      queryClient.setQueryData(["timeline"], (old: TimelineEntryWithJoins[] = []) => old.filter((e) => e.id !== id));
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["timeline"], context.previous);
      }
      toast.error("Delete failed");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
    },
    onSuccess: () => {
      toast.success("Timeline entry deleted");
    },
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="h-3 w-3 mr-1" />;
      case "call":
        return <Phone className="h-3 w-3 mr-1" />;
      case "meeting":
        return <Calendar className="h-3 w-3 mr-1" />;
      case "note":
        return <MessageSquare className="h-3 w-3 mr-1" />;
      case "reminder":
        return <Bell className="h-3 w-3 mr-1" />;
      default:
        return <MoreHorizontal className="h-3 w-3 mr-1" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "email":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "call":
        return "bg-green-100 text-green-800 border-green-200";
      case "meeting":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "note":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "reminder":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-8 p-6 lg:p-8">
        <div className="flex items-center justify-between pb-6 border-b">
          <div>
            <div className="text-sm text-muted-foreground">Home → Timeline</div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Timeline
            </h1>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Loading timeline...</CardTitle>
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
            <div className="text-sm text-muted-foreground">Home → Timeline</div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Timeline
            </h1>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Error loading timeline</CardTitle>
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
          <div className="text-sm text-muted-foreground">Home → Timeline</div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Timeline
          </h1>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditEntry(null)}>New Entry</Button>
          </DialogTrigger>
          <WideDialogContent size="xl">
            <DialogHeader>
              <DialogTitle>{editEntry ? "Edit Timeline Entry" : "Create New Timeline Entry"}</DialogTitle>
              <DialogDescription>
                {editEntry ? "Edit the timeline entry." : "Add a new activity to the timeline."}
              </DialogDescription>
            </DialogHeader>
            <TimelineEntryForm
              onSubmit={async (values) => {
                if (editEntry?.id) {
                  await updateMutation.mutateAsync({ id: editEntry.id, values });
                } else {
                  await createMutation.mutateAsync(values);
                }
              }}
              isSubmitting={createMutation.isPending || updateMutation.isPending}
              companies={companies}
              contacts={contacts}
              editEntry={editEntry}
              onCancel={() => {
                setDialogOpen(false);
                setEditEntry(null);
              }}
            />
          </WideDialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Timeline Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="text-muted-foreground">No timeline entries yet.</p>
          ) : (
            <div className="space-y-4">
              {timeline.map((entry) => (
                <div key={entry.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getActivityIcon(entry.activity_type || "note")}
                        <h3 className="font-semibold">{entry.title}</h3>
                        <Badge variant="outline" className={getActivityColor(entry.activity_type || "note")}>
                          {entry.activity_type || "note"}
                        </Badge>
                      </div>
                      {entry.content && <p className="text-sm text-muted-foreground mb-2">{entry.content}</p>}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {entry.companies && (
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            <Link href={`/companies/${entry.company_id}`} className="hover:underline">
                              {entry.companies.firmenname}
                            </Link>
                          </div>
                        )}
                        {entry.contacts && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <Link href={`/contacts/${entry.contact_id}`} className="hover:underline">
                              {entry.contacts.vorname} {entry.contacts.nachname}
                            </Link>
                          </div>
                        )}
                        <span>
                          {entry.created_at
                            ? formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })
                            : "—"}
                        </span>
                        <span>by {entry.user_name || "Unknown"}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditEntry(entry);
                          setDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(entry.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
