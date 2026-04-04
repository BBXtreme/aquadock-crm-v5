// src/components/features/TimelineEntryForm.tsx
// This component renders a form for creating or editing timeline entries (activities) related to companies and contacts. It uses react-hook-form with zod for validation, and supports selecting associated companies and contacts from dropdowns. It also handles form state and submission.

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/browser";
import type { TimelineEntry } from "@/types/database.types";

const formSchema = z.object({
  title: z.string().min(1, "Titel ist erforderlich"),
  content: z.string().optional(),
  activity_type: z.enum(["note", "call", "email", "meeting", "reminder", "other"]),

  company_id: z
    .union([z.literal("none"), z.string().uuid(), z.null()])
    .transform((val) => (val === "none" || val === null ? null : val))
    .optional(),

  contact_id: z
    .union([z.literal("none"), z.string().uuid(), z.null()])
    .transform((val) => (val === "none" || val === null ? null : val))
    .optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  onSubmit: (values: FormValues) => Promise<void>;
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
  defaultValues?: Partial<FormValues>;
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

  // ALL HOOKS FIRST — strict AIDER-RULES.md compliance
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: editEntry?.title || defaultValues?.title || "",
      content: editEntry?.content || defaultValues?.content || "",
      activity_type:
        (editEntry?.activity_type as FormValues["activity_type"]) || defaultValues?.activity_type || "note",
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
        const { data } = await supabase.from("companies").select("*").eq("id", preselectedCompanyId).single();
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
        activity_type: editEntry.activity_type as FormValues["activity_type"] || "note",
        company_id: editEntry.company_id || "none",
        contact_id: editEntry.contact_id || "none",
      });
    }
  }, [editEntry, form]);

  // Early return AFTER all hooks
  if (!companies) return null;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                <Textarea placeholder="Enter content" {...field} value={field.value ?? ""} />
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
              <FormLabel>Activity Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select activity type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
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
              <FormLabel>Company (optional)</FormLabel>
              <Select
                onValueChange={(val) => field.onChange(val === "none" ? null : val)}
                value={field.value ?? "none"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Kein Unternehmen ausgewählt" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">Kein Unternehmen</SelectItem>
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
              <FormLabel>Contact (optional)</FormLabel>
              <Select
                onValueChange={(val) => field.onChange(val === "none" ? null : val)}
                value={field.value ?? "none"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Kein Kontakt ausgewählt" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">Kein Kontakt</SelectItem>
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
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
