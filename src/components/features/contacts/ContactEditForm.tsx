// src/components/features/contacts/ContactEditForm.tsx
// This component renders a form for editing contact data. It uses react-hook-form with zod for validation, and integrates with the Supabase backend to create or update contact records. It also handles form state and displays success/error toasts.

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { Control } from "react-hook-form";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createContact, updateContact } from "@/lib/actions/contacts";
import { anredeOptions } from "@/lib/constants/contact-options";
import { useT } from "@/lib/i18n/use-translations";
import { createClient } from "@/lib/supabase/browser";
import { type ContactForm, contactSchema } from "@/lib/validations/contact";
import type { Database } from "@/types/database.types";

export default function ContactEditForm({
  contact,
  onSuccess,
  preselectedCompanyId,
}: {
  contact?: Database["public"]["Tables"]["contacts"]["Row"] | null;
  onSuccess?: () => void;
  preselectedCompanyId?: string;
}) {
  const t = useT("contacts");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: ContactForm) => {
      if (contact) {
        return updateContact(contact.id, data as Database["public"]["Tables"]["contacts"]["Update"], createClient());
      }
      const supabase = createClient();
      return await createContact(data as Database["public"]["Tables"]["contacts"]["Insert"], supabase);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["company", data.company_id] });
      if (data?.company_id) {
        queryClient.invalidateQueries({ queryKey: ["contacts", data.company_id] });
      }
      queryClient.invalidateQueries({ queryKey: ["contacts", data?.company_id] });
      queryClient.invalidateQueries({ queryKey: ["reminders", data?.company_id] });
      toast.success(contact ? t("toastUpdated") : t("toastCreated"));
      form.reset();
      onSuccess?.();
    },
    onError: (err) => toast.error(t("toastOperationFailed"), { description: err.message }),
  });

  const form = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      vorname: contact?.vorname || "",
      nachname: contact?.nachname || "",
      anrede: contact?.anrede as "Herr" | "Frau" | "Dr." | "Prof." | undefined || undefined,
      position: contact?.position || undefined,
      email: contact?.email || undefined,
      telefon: contact?.telefon || undefined,
      mobil: contact?.mobil || undefined,
      durchwahl: contact?.durchwahl || undefined,
      notes: contact?.notes || undefined,
      company_id: contact?.company_id || preselectedCompanyId || "",
      is_primary: contact?.is_primary || false,
    },
  });

  useEffect(() => {
    if (contact) {
      form.reset({
        vorname: contact.vorname || "",
        nachname: contact.nachname || "",
        anrede: contact.anrede as "Herr" | "Frau" | "Dr." | "Prof." | undefined || undefined,
        position: contact.position || undefined,
        email: contact.email || undefined,
        telefon: contact.telefon || undefined,
        mobil: contact.mobil || undefined,
        durchwahl: contact.durchwahl || undefined,
        notes: contact.notes || undefined,
        company_id: contact.company_id || "",
        is_primary: contact.is_primary || false,
      });
    }
  }, [contact, form]);

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("companies").select("id, firmenname");
      if (error) throw error;
      return data;
    },
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
              <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
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
                <Input {...field} value={field.value || ""} />
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
                <Input type="email" {...field} value={field.value || ""} />
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
                <Input {...field} value={field.value || ""} />
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
                <Input {...field} value={field.value || ""} />
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
                <Input {...field} value={field.value || ""} />
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
                <Textarea {...field} value={field.value || ""} />
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
              <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("formCompanyPlaceholder")} />
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
          control={form.control as Control<ContactForm>}
          name="is_primary"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>{t("formIsPrimary")}</FormLabel>
              </div>
            </FormItem>
          )}
        />
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? contact
              ? t("formSubmitUpdating")
              : t("formSubmitCreating")
            : contact
              ? t("formSubmitUpdate")
              : t("formSubmitCreate")}
        </Button>
      </form>
    </Form>
  );
}
