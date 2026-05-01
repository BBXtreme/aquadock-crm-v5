// src/components/features/TimelineEntryForm.tsx
// This component renders a form for creating or editing timeline entries (activities) related to companies and contacts. It uses react-hook-form with zod for validation, and supports selecting associated companies and contacts from searchable comboboxes. It also handles form state and submission.

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { TimelineLinkCombobox } from "@/components/features/timeline/TimelineLinkCombobox";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n/use-translations";
import { createClient } from "@/lib/supabase/browser";
import type { TimelineEntry } from "@/types/database.types";

export type TimelineEntryFormValues = {
  title: string;
  content?: string | undefined;
  /** User-selectable types only; `import` / `csv_import` are set by imports and `resolveActivityTypeForTimelinePersist`, not the form. */
  activity_type: "call" | "email" | "meeting" | "other";
  company_id?: string | null;
  contact_id?: string | null;
};

interface Props {
  onSubmit: (values: TimelineEntryFormValues) => Promise<void>;
  isSubmitting: boolean;
  companies: { id: string; firmenname: string; kundentyp?: string }[];
  contacts: {
    id: string;
    vorname: string;
    nachname: string;
    email?: string;
    telefon?: string;
    position?: string;
  }[];
  editEntry?: TimelineEntry | null;
  onCancel?: () => void;
  preselectedCompanyId?: string | null;
  defaultValues?: Partial<TimelineEntryFormValues>;
}

export default function TimelineEntryForm({
  onSubmit,
  isSubmitting,
  companies,
  contacts,
  editEntry,
  onCancel,
  preselectedCompanyId,
  defaultValues,
}: Props) {
  const t = useT("timeline");

  const formSchema = useMemo(
    () =>
      z.object({
        title: z.string().min(1, t("formTitleRequired")),
        content: z.string().optional(),
        activity_type: z.enum(["call", "email", "meeting", "other"]),
        company_id: z.string().uuid().nullable().optional(),
        contact_id: z.string().uuid().nullable().optional(),
      }),
    [t],
  );

  type TimelineFormFields = {
    title: string;
    content?: string;
    activity_type: TimelineEntryFormValues["activity_type"];
    company_id?: string | null;
    contact_id?: string | null;
  };

  const activityTypeForUserForm = useCallback((raw: string | null | undefined): TimelineEntryFormValues["activity_type"] => {
    const v = raw ?? "";
    if (v === "call" || v === "email" || v === "meeting" || v === "other") {
      return v;
    }
    return "other";
  }, []);

  const [extraCompany, setExtraCompany] = useState<{ id: string; firmenname: string; kundentyp?: string } | null>(null);

  useEffect(() => {
    if (!preselectedCompanyId) {
      setExtraCompany(null);
      return;
    }
    if (companies.some((c) => c.id === preselectedCompanyId)) {
      setExtraCompany(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("companies")
        .select("id, firmenname, kundentyp")
        .eq("id", preselectedCompanyId)
        .is("deleted_at", null)
        .maybeSingle();
      if (!cancelled && data) {
        setExtraCompany({
          id: data.id,
          firmenname: data.firmenname,
          kundentyp: data.kundentyp ?? undefined,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [preselectedCompanyId, companies]);

  const mergedCompanyRows = useMemo(() => {
    const byId = new Map<string, { id: string; firmenname: string; kundentyp?: string }>();
    for (const c of companies) {
      byId.set(c.id, c);
    }
    if (extraCompany) {
      byId.set(extraCompany.id, extraCompany);
    }
    return [...byId.values()].sort((a, b) => a.firmenname.localeCompare(b.firmenname));
  }, [companies, extraCompany]);

  const companyItems = useMemo(
    () =>
      mergedCompanyRows.map((c) => ({
        id: c.id,
        label: `${c.firmenname}${c.kundentyp ? ` (${c.kundentyp})` : ""}`,
        keywords: [c.firmenname, c.kundentyp].filter((x): x is string => Boolean(x)),
      })),
    [mergedCompanyRows],
  );

  const sortedContacts = useMemo(() => {
    return [...contacts].sort((a, b) => {
      const ln = a.nachname.localeCompare(b.nachname);
      if (ln !== 0) {
        return ln;
      }
      return a.vorname.localeCompare(b.vorname);
    });
  }, [contacts]);

  const contactItems = useMemo(
    () =>
      sortedContacts.map((c) => {
        const label = `${c.vorname} ${c.nachname}${c.position ? ` (${c.position})` : ""}${c.email ? ` – ${c.email}` : ""}`;
        const keywords = [c.vorname, c.nachname, c.email, c.position].filter((x): x is string => Boolean(x));
        return { id: c.id, label, keywords };
      }),
    [sortedContacts],
  );

  const form = useForm<TimelineFormFields>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: editEntry?.title || defaultValues?.title || "",
      content: editEntry?.content || defaultValues?.content || "",
      activity_type: activityTypeForUserForm(editEntry?.activity_type ?? defaultValues?.activity_type),
      company_id: editEntry?.company_id ?? preselectedCompanyId ?? defaultValues?.company_id ?? null,
      contact_id: editEntry?.contact_id ?? defaultValues?.contact_id ?? null,
    },
  });

  useEffect(() => {
    if (defaultValues) {
      form.reset({
        ...defaultValues,
        ...(defaultValues.activity_type !== undefined
          ? { activity_type: activityTypeForUserForm(defaultValues.activity_type) }
          : {}),
      });
    }
  }, [defaultValues, form, activityTypeForUserForm]);

  useEffect(() => {
    if (preselectedCompanyId) {
      form.setValue("company_id", preselectedCompanyId);
    }
  }, [preselectedCompanyId, form]);

  useEffect(() => {
    if (editEntry) {
      form.reset({
        title: editEntry.title || "",
        content: editEntry.content || "",
        activity_type: activityTypeForUserForm(editEntry.activity_type),
        company_id: editEntry.company_id ?? null,
        contact_id: editEntry.contact_id ?? null,
      });
    }
  }, [editEntry, form, activityTypeForUserForm]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="min-w-0 space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("formTitleLabel")}</FormLabel>
              <FormControl>
                <Input placeholder={t("formTitlePlaceholder")} {...field} />
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
              <FormLabel>{t("formContentLabel")}</FormLabel>
              <FormControl>
                <Textarea placeholder={t("formContentPlaceholder")} {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="activity_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("formActivityTypeLabel")}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("formActivityTypePlaceholder")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="call">{t("activityCall")}</SelectItem>
                  <SelectItem value="email">{t("activityEmail")}</SelectItem>
                  <SelectItem value="meeting">{t("activityMeeting")}</SelectItem>
                  <SelectItem value="other">{t("activityOther")}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="company_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("formCompanyLabel")}</FormLabel>
              <FormControl>
                <TimelineLinkCombobox
                  value={field.value ?? ""}
                  onValueChange={(id) => field.onChange(id === "" ? null : id)}
                  items={companyItems}
                  disabled={isSubmitting}
                  placeholder={t("formCompanyPlaceholder")}
                  searchPlaceholder={t("formCompanySearchPlaceholder")}
                  emptyMessage={t("formCompanyEmpty")}
                  clearLabel={t("formCompanyClear")}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contact_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("formContactLabel")}</FormLabel>
              <FormControl>
                <TimelineLinkCombobox
                  value={field.value ?? ""}
                  onValueChange={(id) => field.onChange(id === "" ? null : id)}
                  items={contactItems}
                  disabled={isSubmitting}
                  placeholder={t("formContactPlaceholder")}
                  searchPlaceholder={t("formContactSearchPlaceholder")}
                  emptyMessage={t("formContactEmpty")}
                  clearLabel={t("formContactClear")}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-wrap justify-end gap-2">
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              {t("formCancel")}
            </Button>
          ) : null}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("formSubmitting") : t("formSubmit")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
