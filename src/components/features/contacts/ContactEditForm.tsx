// src/components/features/ContactEditForm.tsx
// This component renders a form for editing contact data. It uses react-hook-form with zod for validation, and integrates with the Supabase backend to create or update contact records. It also handles form state and displays success/error toasts.

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createContact, updateContact } from "@/lib/actions/contacts";
import { anredeOptions } from "@/lib/constants/company-options";
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
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: ContactForm) => {
      if (contact) {
        return updateContact(contact.id, data as Database["public"]["Tables"]["contacts"]["Update"], createClient());
      }
      // create
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
      toast.success(contact ? "Contact updated" : "Contact created");
      form.reset();
      onSuccess?.();
    },
    onError: (err) => toast.error("Operation failed", { description: err.message }),
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
          control={form.control}
          name="vorname"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vorname</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="nachname"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nachname</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="anrede"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Anrede</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select anrede" />
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
          control={form.control}
          name="position"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Position</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="telefon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefon</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="mobil"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mobil</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="durchwahl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Durchwahl</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} />
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
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value || ""} />
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
              <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
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
          name="is_primary"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Primary Contact</FormLabel>
              </div>
            </FormItem>
          )}
        />
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending
            ? contact
              ? "Updating..."
              : "Creating..."
            : contact
              ? "Update Contact"
              : "Create Contact"}
        </Button>
      </form>
    </Form>
  );
}
