"use client";

import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import TimelineEntryForm, { type TimelineEntryFormValues } from "@/components/features/timeline/TimelineEntryForm";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { PageShell } from "@/components/ui/page-shell";
import { useNumberLocaleTag, useT } from "@/lib/i18n/use-translations";
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
  const localeTag = useNumberLocaleTag();
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

  const createdDate = initialEntry.created_at
    ? new Date(initialEntry.created_at).toLocaleDateString(localeTag)
    : null;

  return (
    <PageShell className="max-w-3xl">
      <header className="flex flex-col gap-4 border-b border-border/40 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/timeline">{t("title")}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="max-w-[40ch] truncate">{initialEntry.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{initialEntry.title}</h1>
            {createdDate && (
              <p className="mt-1 text-muted-foreground">
                {initialEntry.activity_type}
                {" · "}
                {createdDate}
              </p>
            )}
          </div>
        </div>
      </header>

      <TimelineEntryForm
        editEntry={initialEntry}
        companies={companies}
        contacts={contacts}
        isSubmitting={mutation.isPending}
        onSubmit={(values) => mutation.mutateAsync(values)}
      />
    </PageShell>
  );
}
