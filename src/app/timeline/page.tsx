"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Building, Calendar, Clock, Edit, Mail, MessageSquare, MoreHorizontal, Phone, Trash, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import AppLayout from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SkeletonList } from "@/components/ui/SkeletonList";
import { Skeleton } from "@/components/ui/skeleton";
import TimelineEntryForm from "@/components/features/TimelineEntryForm";
import { createClient } from "@/lib/supabase/browser";
import type { TimelineEntry } from "@/lib/supabase/types";

export default function TimelinePage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<TimelineEntry | null>(null);

  // TODO: use useSession or Server Component auth
  // const { userId } = useAuth();

  const { data: timeline = [], isLoading, error } = useQuery({
    queryKey: ["timeline"],
    queryFn: async () => {
      const response = await fetch("/api/timeline");
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      return response.json() as Promise<TimelineEntry[]>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const supabase = createClient(); // browser client
      const { data, error } = await supabase
        .from("companies")
        .select("id, firmenname")
        .order("firmenname")
        .limit(50);

      if (error) throw error;
      return data ?? [];
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

  /*
    TEMPORARY BYPASS FOR DEVELOPMENT
    Timeline page redirects to /login because auth is not fully implemented.
    Remove this bypass after implementing protected routes / middleware / session provider (planned v5.2)
  */
  // useEffect(() => {
  //   if (error && error.message.includes("Unauthorized")) {
  //     router.push("/login");
  //   }
  // }, [error, router]);

  const createMutation = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        ...values,
        user_id: "dev-mock-user-...",
        user_name: "Dev User",
      };
      const res = await fetch("/api/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onMutate: async (newEntry) => {
      await queryClient.cancelQueries({ queryKey: ["timeline"] });
      const previous = queryClient.getQueryData<TimelineEntry[]>(["timeline"]);
      queryClient.setQueryData(["timeline"], (old = []) => [
        { ...newEntry, id: "temp-" + Date.now(), created_at: new Date().toISOString() },
        ...old,
      ]);
      return { previous };
    },
    onError: (err, newEntry, context) => {
      queryClient.setQueryData(["timeline"], context?.previous);
      toast.error("Failed to create entry");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
    },
    onSuccess: () => {
      toast.success("Entry created");
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: any }) => {
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
    onError: (err) => toast.error("Update failed", { description: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/timeline/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      return response.json();
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["timeline"] });
      const previous = queryClient.getQueryData<TimelineEntry[]>(["timeline"]);
      queryClient.setQueryData(["timeline"], (old = []) => old.filter(e => e.id !== id));
      return { previous };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(["timeline"], context?.previous);
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
      <AppLayout>
        <div className="container mx-auto space-y-8 p-6 lg:p-8">
          <div>
            <p className="text-muted-foreground text-sm">Home → Timeline</p>
            <h1 className="font-semibold text-3xl tracking-tight">Timeline</h1>
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
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="container mx-auto space-y-8 p-6 lg:p-8">
          <div>
            <p className="text-muted-foreground text-sm">Home → Timeline</p>
            <h1 className="font-semibold text-3xl tracking-tight">Timeline</h1>
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
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto space-y-8 p-6 lg:p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Home → Timeline</p>
            <h1 className="font-semibold text-3xl tracking-tight">Timeline</h1>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditEntry(null); }}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditEntry(null)}>New Entry</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editEntry ? "Edit Timeline Entry" : "Create New Timeline Entry"}</DialogTitle>
                <DialogDescription>
                  {editEntry ? "Edit the timeline entry." : "Add a new activity to the timeline."}
                </DialogDescription>
              </DialogHeader>
              <TimelineEntryForm
                onSubmit={(values) => {
                  if (editEntry) {
                    updateMutation.mutate({ id: editEntry.id, values });
                  } else {
                    createMutation.mutate(values);
                  }
                }}
                isSubmitting={createMutation.isPending}
                companies={companies}
                contacts={contacts}
                editEntry={editEntry}
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-4">
          {timeline.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No timeline entries yet</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Timeline entries will appear here as activities occur.</p>
              </CardContent>
            </Card>
          ) : (
            timeline.map((entry) => (
              <Card key={entry.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={`text-xs ${getActivityColor(entry.activity_type)}`}>
                          {getActivityIcon(entry.activity_type)}
                          {entry.activity_type}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {entry.created_at && formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <h3 className="font-medium text-lg mb-1">{entry.title}</h3>
                      {entry.content && <p className="text-muted-foreground mb-3">{entry.content}</p>}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {entry.user_name}
                        </div>
                        {entry.company_id && (
                          <div className="flex items-center gap-1">
                            <Building className="h-4 w-4" />
                            Company: <Link href={`/companies/${entry.company_id}`} className="text-blue-600 hover:underline">{entry.companies?.firmenname || "Unknown"}</Link>
                          </div>
                        )}
                        {entry.contact_id && entry.contacts && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            Kontakt: {entry.contacts.vorname} {entry.contacts.nachname}
                            {entry.contacts.position ? ` (${entry.contacts.position})` : ''}
                          </div>
                        )}
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
                        onClick={() => {
                          if (confirm("Delete this timeline entry?")) {
                            deleteMutation.mutate(entry.id);
                          }
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
