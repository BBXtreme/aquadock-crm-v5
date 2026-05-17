// src/components/features/contacts/ContactCreateForm.tsx
// This component renders a form for creating contact data. It uses react-hook-form with zod for validation, and integrates with the Supabase backend to create contact records. It also handles form state and displays success/error toasts.

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import type { Control } from "react-hook-form";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { ReminderCompanyCombobox } from "@/components/features/reminders/ReminderCompanyCombobox";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { anredeOptions } from "@/lib/constants/contact-options";
import { useT } from "@/lib/i18n/use-translations";
import { createClient } from "@/lib/supabase/browser";
import { type ContactForm, contactSchema } from "@/lib/validations/contact";

export default function ContactCreateForm({
  onSuccess,
  companyId,
  onCancel,
}: {
  onSuccess?: () => void;
  companyId?: string;
  onCancel?: () => void;
}) {
  const t = useT("contacts");
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

  const form = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      vorname: "",
      nachname: "",
      anrede: undefined,
      position: undefined,
      email: undefined,
      telefon: undefined,
      mobil: undefined,
      durchwahl: undefined,
      notes: undefined,
      company_id: companyId || undefined,
      is_primary: false,
    },
  });

  const mutation = useMutation({
    mutationFn: async (contact: ContactForm) => {
      const { createContactAction } = await import("@/lib/actions/contacts");
      return createContactAction({
        vorname: contact.vorname,
        nachname: contact.nachname,
        anrede: contact.anrede ?? undefined,
        position: contact.position ?? undefined,
        email: contact.email ?? undefined,
        telefon: contact.telefon ?? undefined,
        mobil: contact.mobil ?? undefined,
        durchwahl: contact.durchwahl ?? undefined,
        notes: contact.notes ?? undefined,
        company_id: contact.company_id ?? undefined,
        is_primary: contact.is_primary,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      if (companyId) {
        queryClient.invalidateQueries({ queryKey: ["contacts", companyId] });
      }
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
          control={form.control as Control<ContactForm>}
          name="vorname"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("formVorname")}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control as Control<ContactForm>}
          name="nachname"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("formNachname")}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control as Control<ContactForm>}
          name="anrede"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("formSalutation")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value ?? ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("formSalutationPlaceholder")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {anredeOptions.map((option) => (
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
          control={form.control as Control<ContactForm>}
          name="position"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("formPosition")}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control as Control<ContactForm>}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("formEmail")}</FormLabel>
              <FormControl>
                <Input type="email" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control as Control<ContactForm>}
          name="telefon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("formTelefon")}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control as Control<ContactForm>}
          name="mobil"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("formMobil")}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control as Control<ContactForm>}
          name="durchwahl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("formDurchwahl")}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control as Control<ContactForm>}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("formNotes")}</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control as Control<ContactForm>}
          name="company_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("formCompany")}</FormLabel>
              {companyId ? (
                <FormControl>
                  <ReminderCompanyCombobox
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                    companies={companies}
                    disabled
                    placeholder={t("formCompanyPlaceholder")}
                    searchPlaceholder={t("formCompanySearchPlaceholder")}
                    emptyMessage={t("formCompanyEmpty")}
                    clearLabel={t("formCompanyClear")}
                  />
                </FormControl>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <FormControl>
                      <ReminderCompanyCombobox
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                        companies={companies}
                        hideClearButton
                        placeholder={t("formCompanyPlaceholder")}
                        searchPlaceholder={t("formCompanySearchPlaceholder")}
                        emptyMessage={t("formCompanyEmpty")}
                        clearLabel={t("formCompanyClear")}
                      />
                    </FormControl>
                  </div>
                  {field.value ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t("formCompanyClearAria")}
                      title={t("formCompanyClearAria")}
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => field.onChange("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              )}
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
            {mutation.isPending ? t("formSubmitCreating") : t("formSubmitCreate")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
