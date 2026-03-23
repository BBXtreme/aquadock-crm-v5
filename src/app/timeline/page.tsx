"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Calendar, Clock, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
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
import type { TimelineEntry } from "@/lib/supabase/types";

export default function TimelinePage() {
  const queryClient = useQueryClient();
  const router = useRouter();

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

  if (error && !error.message.includes("Unauthorized")) {
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
          <Dialog>
            <DialogTrigger asChild>
              <Button>New Entry</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Timeline Entry</DialogTitle>
                <DialogDescription>
                  Add a new activity to the timeline. (Form implementation coming soon)
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-muted-foreground">
                  This is a placeholder. The full form with react-hook-form and zod will be added later.
                </p>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    toast.info("New timeline entry form coming soon!");
                  }}
                >
                  Placeholder Action
                </Button>
              </div>
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
