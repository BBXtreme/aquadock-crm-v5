// src/components/features/reminder/ReminderEditForm.tsx
// This component renders a form for editing company data (Firmendaten). It uses react-hook-form with zod for validation, and integrates with the Supabase backend to update company records. It also handles form state and displays success/error toasts.

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateReminder } from "@/lib/actions/reminders";
import { priorityOptions, reminderStatusOptions } from "@/lib/constants/company-options";
import { createClient } from "@/lib/supabase/browser";
import { reminderFormSchema, toReminderInsert, toReminderUpdate } from "@/lib/validations/reminder";
import type { Database } from "@/types/database.types";

type ReminderFormValues = z.infer<typeof reminderFormSchema>;

export default function ReminderEditForm({
  reminder,
  onSuccess,
  preselectedCompanyId,
}: {
  reminder?: Database["public"]["Tables"]["reminders"]["Row"] | null;
  onSuccess?: () => void;
  preselectedCompanyId?: string;
}) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: ReminderFormValues) => {
      if (reminder) {
        return updateReminder(reminder.id, toReminderUpdate(data), createClient());
      }
      // create
      const supabase = createClient();
      const { data: newData, error } = await supabase.from("reminders").insert(toReminderInsert(data)).select().single();
      if (error) throw error;
      return newData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({ queryKey: ["company", data.company_id] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      if (data?.company_id) {
        queryClient.invalidateQueries({ queryKey: ["reminders", data.company_id] });
      }
      queryClient.invalidateQueries({ queryKey: ["contacts", data?.company_id] });
      queryClient.invalidateQueries({ queryKey: ["reminders", data?.company_id] });
      toast.success(reminder ? "Reminder updated" : "Reminder created");
      form.reset();
      onSuccess?.();
    },
    onError: (err) => toast.error("Operation failed", { description: err.message }),
  });

  const form = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderFormSchema),
    defaultValues: {
      title: reminder?.title || "",
      company_id: reminder?.company_id || preselectedCompanyId || "",
      due_date: reminder?.due_date ? new Date(reminder.due_date) : undefined,
      priority: (reminder?.priority as "hoch" | "normal" | "niedrig" | null) || "normal",
      status: (reminder?.status as "open" | "closed" | null) || "open",
      assigned_to: reminder?.assigned_to || null,
      description: reminder?.description || "",
    },
  });

  useEffect(() => {
    if (reminder) {
      form.reset({
        title: reminder.title || "",
        company_id: reminder.company_id || "",
        due_date: reminder.due_date ? new Date(reminder.due_date) : undefined,
        priority: (reminder.priority as "hoch" | "normal" | "niedrig" | null) || "normal",
        status: (reminder.status as "open" | "closed" | null) || "open",
        assigned_to: reminder.assigned_to || null,
        description: reminder.description || "",
      });
    }
  }, [reminder, form]);

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("companies").select("id, firmenname");
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("profiles").select("id, display_name");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (preselectedCompanyId && companies.length > 0 && !reminder) {
      form.setValue("company_id", preselectedCompanyId);
    }
  }, [companies, preselectedCompanyId, form, reminder]);

  const onSubmit = form.handleSubmit((data) => mutation.mutate(data));

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          control={form.control as Control<ReminderFormValues>}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control as Control<ReminderFormValues>}
          name="company_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
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
        <FormField
          control={form.control as Control<ReminderFormValues>}
          name="due_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Due Date</FormLabel>
              <FormControl>
                <Input
                  type="datetime-local"
                  value={field.value ? field.value.toISOString().slice(0, 16) : ""}
                  onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control as Control<ReminderFormValues>}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control as Control<ReminderFormValues>}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {reminderStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
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
          name="assigned_to"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assigned To</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value === "" ? null : value)}
                value={field.value || ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.display_name || "Unnamed User"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control as Control<ReminderFormValues>}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? reminder
              ? "Updating..."
              : "Creating..."
            : reminder
              ? "Update Reminder"
              : "Create Reminder"}
        </Button>
      </form>
    </Form>
  );
}
