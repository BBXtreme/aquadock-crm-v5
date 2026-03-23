"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Calendar, Clock, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SkeletonList } from "@/components/ui/SkeletonList";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { getCompanies } from "@/lib/supabase/services/companies";
import { createTimelineEntry } from "@/lib/supabase/services/timeline-server";
import type { TimelineEntry } from "@/lib/supabase/types";

const timelineSchema = z.object({
  activity_type: z.string().min(1, "Activity type is required"),
  title: z.string().min(1, "Title is required"),
  content: z.string().optional(),
  user_name: z.string().min(1, "User name is required"),
  company_id: z.string().optional(),
});

type TimelineForm = z.infer<typeof timelineSchema>;

export default function TimelinePage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);

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
    queryFn: () => getCompanies("dummy"),
    staleTime: 5 * 60 * 1000,
  });

  const form = useForm<TimelineForm>({
    resolver: zodResolver(timelineSchema),
    defaultValues: {
      activity_type: "",
      title: "",
      content: "",
      user_name: "",
      company_id: "",
    },
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
    mutationFn: (values: TimelineForm) => createTimelineEntry({ ...values, user_id: "dev-user-11111111-2222-3333-4444-555555555555" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      setDialogOpen(false);
      form.reset();
      toast.success("Timeline entry created");
    },
    onError: (err) => toast.error("Creation failed", { description: err.message }),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      toast.success("Timeline entry deleted");
    },
    onError: (err) => toast.error("Deletion failed", { description: err.message }),
  });

  const activityTypes = ["note", "call", "meeting", "email", "task"];

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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>New Entry</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Timeline Entry</DialogTitle>
                <DialogDescription>
                  Add a new activity to the timeline.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="activity_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Activity Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select activity type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {activityTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content (optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter content" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="user_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter user name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="company_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company (optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select company" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {companies.map((company) => (
                              <SelectItem key={company.id} value={company.id}>
                                {company.firmenname}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDialogOpen(false);
                        form.reset();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Creating..." : "Create"}
                    </Button>
                  </div>
                </form>
              </Form>
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
                        <Badge variant="outline" className="text-xs">
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
                            <Calendar className="h-4 w-4" />
                            Company: {entry.companies?.firmenname || "Unknown"}
                          </div>
                        )}
                      </div>
                    </div>
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
                      Delete
                    </Button>
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
