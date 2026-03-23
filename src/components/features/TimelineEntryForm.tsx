"use client";

import { useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Company, TimelineEntry } from "@/lib/supabase/types";

const formSchema = z.object({
  title: z.string().min(1, "Titel ist erforderlich"),
  content: z.string().optional(),
  activity_type: z.enum(["note", "call", "email", "meeting", "reminder", "other"]),

  company_id: z
    .union([z.literal("none"), z.string().uuid()])
    .transform((val) => (val === "none" ? null : val))
    .optional(),

  contact_id: z
    .union([z.literal("none"), z.string().uuid()])
    .transform((val) => (val === "none" ? null : val))
    .optional(),

  user_name: z.string().min(1, "Benutzername ist erforderlich"),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  onSubmit: (values: FormValues) => Promise<void>;
  isSubmitting: boolean;
  companies: Company[];
  contacts: { id: string; vorname: string; nachname: string; email?: string; telefon?: string; position?: string }[];
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
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues || {
      title: "",
      content: "",
      activity_type: "note",
      company_id: "none",
      contact_id: "none",
      user_name: "",
    },
  });

  useEffect(() => {
    if (defaultValues) {
      form.reset(defaultValues);
    }
  }, [defaultValues, form]);

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
                  {companies.map((company) => (
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
