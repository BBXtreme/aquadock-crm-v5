// src/components/features/reminder/ReminderCreateForm.tsx
// This component renders a form for creating reminders. It uses react-hook-form with zod for validation, and integrates with the Supabase backend to create reminder records. It also handles form state and displays success/error toasts.

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { ReminderCompanyCombobox } from "@/components/features/reminder/ReminderCompanyCombobox";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createReminderAction } from "@/lib/actions/reminders";
import { priorityOptions, reminderStatusOptions } from "@/lib/constants/company-options";
import { useT } from "@/lib/i18n/use-translations";
import { createClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database.types";

const reminderSchema = z.object({
  title: z.string().min(1, "Title is required"),
  company_id: z.string().min(1, "Company is required"),
  due_date: z.string().min(1, "Due date is required"),
  priority: z.string().optional(),
  status: z.string().optional(),
  assigned_to: z.string().nullable().optional(),
  description: z.string().optional(),
});

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

export default function ReminderCreateForm({
  onSuccess,
  preselectedCompanyId,
}: {
  onSuccess?: () => void;
  preselectedCompanyId?: string;
}) {
  const t = useT("reminders");
  const queryClient = useQueryClient();

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

  const form = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      title: "",
      company_id: preselectedCompanyId || "",
      due_date: "",
      priority: "normal",
      status: "open",
      assigned_to: null,
      description: "",
    },
  });

  useEffect(() => {
    if (preselectedCompanyId) {
      form.setValue("company_id", preselectedCompanyId);
    }
  }, [preselectedCompanyId, form]);

  const mutation = useMutation<Database["public"]["Tables"]["reminders"]["Row"], Error, ReminderFormValues>({
    mutationFn: (data: ReminderFormValues) => createReminderAction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      toast.success(t("toastCreated"));
      form.reset();
      onSuccess?.();
    },
    onError: (err) => toast.error(t("toastCreateFailed"), { description: err.message }),
  });

  const onSubmit = form.handleSubmit((data) => mutation.mutate(data));

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          control={form.control}
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
          control={form.control}
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
          control={form.control}
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
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("formLabelPriority")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("formLabelStatus")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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
          control={form.control}
          name="assigned_to"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("formLabelAssignedTo")}</FormLabel>
              <Select onValueChange={(value) => field.onChange(value === "unassigned" ? null : value)} value={field.value ?? "unassigned"}>
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
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("formLabelDescription")}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? t("formSubmitCreating") : t("formSubmitCreate")}
        </Button>
      </form>
    </Form>
  );
}
