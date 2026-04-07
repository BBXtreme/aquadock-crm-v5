// src/app/(protected)/timeline/ClientTimelinePage.tsx

"use client";

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

import TimelineEntryForm, { type TimelineEntryFormValues } from "@/components/features/timeline/TimelineEntryForm";
import TimelineTable from "@/components/tables/TimelineTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LoadingState } from "@/components/ui/LoadingState";
import { WideDialogContent } from "@/components/ui/wide-dialog";
import { createTimelineEntryAction } from "@/lib/actions/timeline-forms";
import { useT } from "@/lib/i18n/use-translations";
import { createClient } from "@/lib/supabase/browser";
import type { Company } from "@/types/database.types";

function ClientTimelinePage() {
  const t = useT("timeline");
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: companies = [] } = useSuspenseQuery({
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

  const { data: contacts = [] } = useSuspenseQuery({
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
    mutationFn: async (values: TimelineEntryFormValues) => {
      return createTimelineEntryAction({
        title: values.title.trim() || t("defaultEntryTitle"),
        content: values.content?.trim() || null,
        activity_type: values.activity_type || "note",
        company_id: values.company_id || null,
        contact_id: values.contact_id ?? null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      setDialogOpen(false);
      toast.success(t("toastCreated"));
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : t("unknownError");
      toast.error(t("toastCreateFailed"), { description: message });
    },
  });

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("create") === "true") {
      setDialogOpen(true);
      url.searchParams.delete("create");
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  return (
    <Suspense fallback={<LoadingState count={20} />}>
      <div className="flex items-center justify-between pb-6 border-b">
        <div>
          <div className="text-sm text-muted-foreground">{t("breadcrumb")}</div>
          <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            {t("title")}
          </h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>{t("newActivity")}</Button>
          </DialogTrigger>
          <WideDialogContent size="xl">
            <DialogHeader>
              <DialogTitle>{t("createDialogTitle")}</DialogTitle>
              <DialogDescription>{t("createDialogDescription")}</DialogDescription>
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
    </Suspense>
  );
}

export default ClientTimelinePage;
