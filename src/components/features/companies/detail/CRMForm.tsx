// This component is responsible for rendering a form to update CRM-related information for a company. -  status, value, and notes. It uses react-hook-form for form state management and validation with zod. Upon submission, it updates the company data in the Supabase database and provides user feedback with toast notifications.
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n/use-translations";
import { createClient } from "@/lib/supabase/browser";
import type { Company } from "@/types/database.types";

const crmSchema = z.object({
  status: z
    .enum([
      "lead",
      "interessant",
      "qualifiziert",
      "akquise",
      "angebot",
      "gewonnen",
      "verloren",
      "kunde",
      "partner",
      "inaktiv",
    ])
    .optional()
    .nullable(),
  value: z.number().nullable(),
  notes: z.string().optional(),
});

type CRMFormValues = z.infer<typeof crmSchema>;

const CRM_STATUS_VALUES = [
  "lead",
  "interessant",
  "qualifiziert",
  "akquise",
  "angebot",
  "gewonnen",
  "verloren",
  "kunde",
  "partner",
  "inaktiv",
] as const satisfies ReadonlyArray<NonNullable<CRMFormValues["status"]>>;

interface Props {
  company: Company;
  readOnly?: boolean;
  onSuccess: () => void;
}

export default function CRMForm({ company, readOnly = false, onSuccess }: Props) {
  const t = useT("companies");
  const queryClient = useQueryClient();

  const form = useForm<CRMFormValues>({
    resolver: zodResolver(crmSchema),
    defaultValues: {
      status: company.status as CRMFormValues["status"],
      value: company.value ?? null,
      notes: company.notes || "",
    },
  });

  useEffect(() => {
    form.reset({
      status: company.status as CRMFormValues["status"],
      value: company.value ?? null,
      notes: company.notes || "",
    });
  }, [company.status, company.value, company.notes, form]);

  const onSubmit = form.handleSubmit(async (data) => {
    if (readOnly) {
      return;
    }
    try {
      const supabase = createClient();
      const { error } = await supabase.from("companies").update(data).eq("id", company.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["company", company.id] });
      toast.success(t("detailCrmToastSaved"));
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("unknownError");
      toast.error(t("detailCrmToastSaveFailed"), { description: message });
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("detailCrmLabelStatus")}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""} disabled={readOnly}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("detailCrmStatusPlaceholder")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CRM_STATUS_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`detailCrmStatus.${value}`)}
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
          name="value"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("detailCrmLabelValue")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  disabled={readOnly}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("detailCrmLabelNotes")}</FormLabel>
              <FormControl>
                <Textarea {...field} disabled={readOnly} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {readOnly ? null : <Button type="submit">{t("detailCrmSaveButton")}</Button>}
      </form>
    </Form>
  );
}
