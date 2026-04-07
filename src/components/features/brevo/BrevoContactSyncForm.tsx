// src/components/features/brevo/BrevoContactSyncForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Control } from "react-hook-form";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type BrevoSyncContactsResult, syncContactsToBrevo } from "@/lib/actions/brevo";
import { kundentypOptions, statusOptions } from "@/lib/constants/company-options";
import { useT } from "@/lib/i18n/use-translations";
import { type BrevoSyncFormData, brevoSyncSchema } from "@/lib/validations/brevo";

const ALL_VALUE = "__all__";

export default function BrevoContactSyncForm() {
  const t = useT("brevo");

  const describeSyncResult = (r: BrevoSyncContactsResult): string => {
    const lines = [
      t("syncResultMatched", { count: r.matched }),
      t("syncResultSkipped", { count: r.skippedNoEmail }),
      t("syncResultSubmitted", { count: r.submitted }),
    ];
    if (r.processId != null) {
      lines.push(t("syncResultProcessId", { id: r.processId }));
    }
    return lines.join(" · ");
  };

  const form = useForm<BrevoSyncFormData>({
    resolver: zodResolver(brevoSyncSchema),
    defaultValues: {},
  });

  const onSubmit = async (data: BrevoSyncFormData) => {
    const formData = new FormData();
    if (data.filterKundentyp?.trim()) {
      formData.append("filterKundentyp", data.filterKundentyp.trim());
    }
    if (data.filterStatus?.trim()) {
      formData.append("filterStatus", data.filterStatus.trim());
    }
    try {
      const res = await syncContactsToBrevo(formData);
      const description = describeSyncResult(res);

      if (res.matched === 0) {
        toast.warning(t("syncToastNoContactsTitle"), {
          description: t("syncToastNoContactsDescription"),
        });
        return;
      }

      if (res.submitted > 0) {
        toast.success(t("syncToastStarted"), { description });
        return;
      }

      toast.info(t("syncToastNothingTitle"), {
        description:
          res.skippedNoEmail > 0 ? description : t("syncToastNothingDescription"),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t("unknownError");
      toast.error(t("syncToastFailed"), { description: message });
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("syncFormApiKeyHelp")}</p>
      <p className="text-sm text-muted-foreground border-l-2 border-primary/30 pl-3">{t("syncFormMassSyncHelp")}</p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
          <FormField
            control={form.control as Control<BrevoSyncFormData>}
            name="filterKundentyp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("syncFormFilterKundentyp")}</FormLabel>
                <Select
                  value={field.value && field.value.length > 0 ? field.value : ALL_VALUE}
                  onValueChange={(v) => {
                    field.onChange(v === ALL_VALUE ? undefined : v);
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("syncFormPlaceholderKundentyp")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>{t("syncFormOptionAll")}</SelectItem>
                    {kundentypOptions.map((option) => (
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
            control={form.control as Control<BrevoSyncFormData>}
            name="filterStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("syncFormFilterStatus")}</FormLabel>
                <Select
                  value={field.value && field.value.length > 0 ? field.value : ALL_VALUE}
                  onValueChange={(v) => {
                    field.onChange(v === ALL_VALUE ? undefined : v);
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("syncFormPlaceholderStatus")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>{t("syncFormOptionAll")}</SelectItem>
                    {statusOptions.map((option) => (
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
          <Button type="submit">{t("syncFormSubmit")}</Button>
        </form>
      </Form>
    </div>
  );
}
