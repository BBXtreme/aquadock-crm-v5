// src/components/features/ReminderEditForm.tsx
// This component renders a form for editing company data (Firmendaten). It uses react-hook-form with zod for validation, and integrates with the Supabase backend to update company records. It also handles form state and displays success/error toasts.

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { priorityOptions, reminderStatusOptions } from "@/lib/constants/company-options";
import { createClient } from "@/lib/supabase/browser-client";
import type { Database } from "@/lib/supabase/database.types";
import { updateReminder } from "@/lib/supabase/services/reminders";

const reminderSchema = z.object({
  title: z.string().min(1, "Title is required"),
  company_id: z.string().min(1, "Company is required"),
  due_date: z.string().min(1, "Due date is required"),
  priority: z.string().optional(),
  status: z.string().optional(),
  assigned_to: z.string().optional(),
  description: z.string().optional(),
});

type ReminderFormValues = z.infer<typeof reminderSchema>;

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
        return updateReminder(reminder.id, data, createClient());
      }
      // create
      const supabase = createClient();
      const { data: newData, error } = await supabase.from("reminders").insert(data).select().single();
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
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      title: reminder?.title || "",
      company_id: reminder?.company_id || preselectedCompanyId || "",
      due_date: reminder?.due_date ? new Date(reminder.due_date).toISOString().slice(0, 16) : "",
      priority: reminder?.priority || "normal",
      status: reminder?.status || "open",
      assigned_to: reminder?.assigned_to || "",
      description: reminder?.description || "",
    },
  });

  useEffect(() => {
    if (reminder) {
      form.reset({
        title: reminder.title || "",
        company_id: reminder.company_id || "",
        due_date: reminder.due_date ? new Date(reminder.due_date).toISOString().slice(0, 16) : "",
        priority: reminder.priority || "normal",
        status: reminder.status || "open",
        assigned_to: reminder.assigned_to || "",
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
          control={form.control}
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
          control={form.control}
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
          control={form.control}
          name="due_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Due Date</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
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
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
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
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} />
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
