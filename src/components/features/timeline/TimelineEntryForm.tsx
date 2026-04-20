// src/components/features/TimelineEntryForm.tsx
// This component renders a form for creating or editing timeline entries (activities) related to companies and contacts. It uses react-hook-form with zod for validation, and supports selecting associated companies and contacts from dropdowns. It also handles form state and submission.

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

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
  activity_type: "note" | "call" | "email" | "meeting" | "other";
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
  const [localCompanies, setLocalCompanies] = useState<{ id: string; firmenname: string; kundentyp?: string }[]>([]);
  const t = useT("timeline");

  const formSchema = useMemo(
    () =>
      z.object({
        title: z.string().min(1, t("formTitleRequired")),
        content: z.string().optional(),
        activity_type: z.enum(["note", "call", "email", "meeting", "other"]),
        company_id: z
          .union([z.literal("none"), z.string().uuid(), z.null()])
          .transform((val) => (val === "none" || val === null ? null : val))
          .optional(),
        contact_id: z
          .union([z.literal("none"), z.string().uuid(), z.null()])
          .transform((val) => (val === "none" || val === null ? null : val))
          .optional(),
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

  const form = useForm<TimelineFormFields>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: editEntry?.title || defaultValues?.title || "",
      content: editEntry?.content || defaultValues?.content || "",
      activity_type:
        (editEntry?.activity_type as TimelineEntryFormValues["activity_type"]) ||
        defaultValues?.activity_type ||
        "note",
      company_id: editEntry?.company_id || preselectedCompanyId || "none",
      contact_id: editEntry?.contact_id || defaultValues?.contact_id || "none",
    },
  });

  useEffect(() => {
    setLocalCompanies((prev) => {
      const newCompanies = [...prev];
      companies.forEach((c) => {
        if (!newCompanies.find((nc) => nc.id === c.id)) {
          newCompanies.push(c);
        }
      });
      return newCompanies;
    });
  }, [companies]);

  useEffect(() => {
    if (preselectedCompanyId && !localCompanies.find((c) => c.id === preselectedCompanyId)) {
      const fetchCompany = async () => {
        const supabase = createClient();
        const { data } = await supabase
          .from("companies")
          .select("*")
          .eq("id", preselectedCompanyId)
          .is("deleted_at", null)
          .single();
        if (data) {
          setLocalCompanies((prev) => {
            if (!prev.find((c) => c.id === data.id)) {
              return [...prev, { id: data.id, firmenname: data.firmenname, kundentyp: data.kundentyp }];
            }
            return prev;
          });
        }
      };
      fetchCompany();
    }
  }, [preselectedCompanyId, localCompanies.find]);

  useEffect(() => {
    if (defaultValues) {
      form.reset(defaultValues);
    }
  }, [defaultValues, form]);

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
        activity_type: (editEntry.activity_type as TimelineEntryFormValues["activity_type"]) || "note",
        company_id: editEntry.company_id || "none",
        contact_id: editEntry.contact_id || "none",
      });
    }
  }, [editEntry, form]);

  if (!companies) {
    return null;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  <SelectItem value="note">{t("activityNote")}</SelectItem>
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
              <Select
                onValueChange={(val) => field.onChange(val === "none" ? null : val)}
                value={field.value ?? "none"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("formCompanyPlaceholder")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">{t("formCompanyNone")}</SelectItem>
                  {localCompanies
                    .filter((company, index, self) => self.findIndex((c) => c.id === company.id) === index)
                    .map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.firmenname}
                        {company.kundentyp ? ` (${company.kundentyp})` : ""}
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
          name="contact_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("formContactLabel")}</FormLabel>
              <Select
                onValueChange={(val) => field.onChange(val === "none" ? null : val)}
                value={field.value ?? "none"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("formContactPlaceholder")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">{t("formContactNone")}</SelectItem>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.vorname} {c.nachname}
                      {c.position ? ` (${c.position})` : ""}
                      {c.email ? ` – ${c.email}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("formSubmitting") : t("formSubmit")}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              {t("formCancel")}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
