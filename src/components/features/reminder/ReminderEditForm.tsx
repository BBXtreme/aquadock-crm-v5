// src/components/features/reminder/ReminderEditForm.tsx
// This component renders a form for editing company data (Firmendaten). It uses react-hook-form with zod for validation, and integrates with the Supabase backend to update company records. It also handles form state and displays success/error toasts.

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { type Control, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { ReminderCompanyCombobox } from "@/components/features/reminder/ReminderCompanyCombobox";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createReminderAction } from "@/lib/actions/create-reminder-action";
import { priorityOptions, reminderStatusOptions } from "@/lib/constants/company-options";
import { useT } from "@/lib/i18n/use-translations";
import { updateReminder } from "@/lib/services/reminders";
import { createClient } from "@/lib/supabase/browser";
import { reminderSchema, toReminderUpdate } from "@/lib/validations/reminder";
import type { Database, } from "@/types/database.types";

type ReminderFormValues = z.infer<typeof reminderSchema>;

const PRIORITY_LABEL_KEYS = {
  hoch: "priorityHoch",
  normal: "priorityNormal",
  niedrig: "priorityNiedrig",
} as const;

const STATUS_LABEL_KEYS = {
  open: "statusOpen",
  closed: "statusClosed",
} as const;

export default function ReminderEditForm({
  reminder,
  onSuccess,
  preselectedCompanyId,
  user,
  onCancel,
}: {
  reminder?: Database["public"]["Tables"]["reminders"]["Row"] | null;
  onSuccess?: () => void;
  preselectedCompanyId?: string;
  user?: { id: string } | null;
  onCancel?: () => void;
}) {
  const t = useT("reminders");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: ReminderFormValues) => {
      if (reminder) {
        return updateReminder(reminder.id, { ...toReminderUpdate(data), user_id: user?.id ?? null }, createClient());
      }
      return createReminderAction(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      if (data?.company_id) {
        queryClient.invalidateQueries({ queryKey: ["reminders", data.company_id] });
      }
      toast.success(reminder ? t("toastUpdatedSuccess") : t("toastCreated"));
      form.reset();
      onSuccess?.();
    },
    onError: (err) => toast.error(t("toastOperationFailed"), { description: err.message }),
  });

  const form = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      title: reminder?.title || "",
      company_id: reminder?.company_id || preselectedCompanyId || "",
      due_date: reminder?.due_date ? new Date(reminder.due_date).toISOString().slice(0, 16) : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
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
        due_date: reminder.due_date ? new Date(reminder.due_date).toISOString().slice(0, 16) : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
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
      const { data, error } = await supabase
        .from("companies")
        .select("id, firmenname")
        .is("deleted_at", null)
        .order("firmenname", { ascending: true });
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
              <FormLabel>{t("formLabelTitle")}</FormLabel>
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
              <FormLabel>{t("formLabelCompany")}</FormLabel>
              <FormControl>
                <ReminderCompanyCombobox
                  value={field.value}
                  onValueChange={field.onChange}
                  companies={companies}
                  placeholder={t("formPlaceholderCompany")}
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
          control={form.control as Control<ReminderFormValues>}
          name="due_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("formLabelDueDate")}</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
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
              <FormLabel>{t("formLabelPriority")}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("formPlaceholderPriority")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {priorityOptions.map((option) => {
                    const key = PRIORITY_LABEL_KEYS[option.value as keyof typeof PRIORITY_LABEL_KEYS];
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        {key ? t(key) : option.label}
                      </SelectItem>
                    );
                  })}
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
              <FormLabel>{t("formLabelStatus")}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("formPlaceholderStatus")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {reminderStatusOptions.map((option) => {
                    const key = STATUS_LABEL_KEYS[option.value as keyof typeof STATUS_LABEL_KEYS];
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        {key ? t(key) : option.label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control as Control<ReminderFormValues>}
          name="assigned_to"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("formLabelAssignedTo")}</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value === "unassigned" ? null : value)}
                value={field.value ?? "unassigned"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("formPlaceholderAssignee")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="unassigned">{t("unassigned")}</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.display_name || t("formAssigneeUnnamed")}
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
              <FormLabel>{t("formLabelDescription")}</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-wrap justify-end gap-2">
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              {t("cancel")}
            </Button>
          ) : null}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending
              ? reminder
                ? t("formSubmitUpdating")
                : t("formSubmitCreating")
              : reminder
                ? t("formSubmitUpdate")
                : t("formSubmitCreate")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
