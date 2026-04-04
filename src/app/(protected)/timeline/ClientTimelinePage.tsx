// src/app/(protected)/timeline/ClientTimelinePage.tsx

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import TimelineEntryForm from "@/components/features/timeline/TimelineEntryForm";
import TimelineTable from "@/components/tables//TimelineTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { WideDialogContent } from "@/components/ui/wide-dialog";
import { createClient } from "@/lib/supabase/browser";
import type { Company, } from "@/types/database.types";

function ClientTimelinePage() {
  const queryClient = useQueryClient();
  const _router = useRouter();
  const searchParams = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);

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

  useEffect(() => {
    if (searchParams.get("create") === "true") {
      setDialogOpen(true);
    }
  }, [searchParams]);

  return (
    <>
      <div className="flex items-center justify-between pb-6 border-b">
        <div>
          <div className="text-sm text-muted-foreground">Home → Timeline</div>
          <h1 className="text-3xl font-bold tracking-tight">
            Timeline
          </h1>
          <p className="text-muted-foreground">Aktivitäten & Historie</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>Neuer Eintrag</Button>
          </DialogTrigger>
          <WideDialogContent size="xl">
            <DialogHeader>
              <DialogTitle>Create New Timeline Entry</DialogTitle>
              <DialogDescription>Add a new activity to the timeline.</DialogDescription>
            </DialogHeader>
            <TimelineEntryForm
              onSubmit={async (values) => {
                await createMutation.mutateAsync(values);
              }}
              isSubmitting={createMutation.isPending}
              companies={companies}
              contacts={contacts}
              onCancel={() => setDialogOpen(false)}
            />
          </WideDialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-6">
          <TimelineTable />
        </CardContent>
      </Card>
    </>
  );
}

export default ClientTimelinePage;
