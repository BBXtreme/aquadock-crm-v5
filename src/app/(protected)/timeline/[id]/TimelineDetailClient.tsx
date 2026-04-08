"use client";

import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import TimelineEntryForm, { type TimelineEntryFormValues } from "@/components/features/timeline/TimelineEntryForm";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/use-translations";
import { createClient } from "@/lib/supabase/browser";
import type { TimelineEntry } from "@/types/database.types";

export default function TimelineDetailClient({
  entryId,
  initialEntry,
}: {
  entryId: string;
  initialEntry: TimelineEntry;
}) {
  const t = useT("timeline");
  const router = useRouter();

  const { data: companies = [] } = useSuspenseQuery({
    queryKey: ["timeline-detail-companies"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("companies")
        .select("id, firmenname, kundentyp")
        .is("deleted_at", null)
        .order("firmenname", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: contacts = [] } = useSuspenseQuery({
    queryKey: ["timeline-detail-contacts"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("contacts")
        .select("id, vorname, nachname, email, telefon, position")
        .is("deleted_at", null)
        .order("nachname")
        .order("vorname")
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: TimelineEntryFormValues) => {
      const res = await fetch(`/api/timeline/${entryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        throw new Error("update failed");
      }
    },
    onSuccess: () => {
      toast.success(t("toastUpdated"));
      router.push("/timeline");
    },
    onError: () => {
      toast.error(t("toastUpdateFailed"));
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="sm" asChild>
          <Link href="/timeline">{t("detailBackLink")}</Link>
        </Button>
      </div>
      <TimelineEntryForm
        editEntry={initialEntry}
        companies={companies}
        contacts={contacts}
        isSubmitting={mutation.isPending}
        onSubmit={(values) => mutation.mutateAsync(values)}
      />
    </div>
  );
}
