// src/components/features/CompanyCreateForm.tsx
// This component renders a form for creating company data (Firmendaten). It uses react-hook-form with zod for validation, and integrates with the Supabase backend to create company records. It also handles form state and displays success/error toasts.

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BarChart, Building, MapPin, Waves } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createCompany } from "@/lib/actions/companies";
import { wassertypOptions } from "@/lib/constants";
import { firmentypOptions, kundentypOptions, landOptions, statusOptions } from "@/lib/constants/company-options";
import { createClient } from "@/lib/supabase/browser";
import { type CompanyFormValues, companySchema } from "@/lib/validations/company";

export default function CompanyCreateForm({ onSuccess }: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      firmenname: "",
      rechtsform: undefined,
      kundentyp: "sonstige",
      firmentyp: undefined,
      strasse: undefined,
      plz: undefined,
      stadt: undefined,
      bundesland: undefined,
      land: "Deutschland",
      website: undefined,
      telefon: undefined,
      email: undefined,
      wasserdistanz: undefined,
      wassertyp: undefined,
      lat: undefined,
      lon: undefined,
      osm: undefined,
      status: "lead",
      value: undefined,
      notes: undefined,
    },
  });

  const mutation = useMutation({
    mutationFn: (company: CompanyFormValues) => createCompany(company, createClient()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Unternehmen erfolgreich angelegt");
      form.reset();
      onSuccess?.();
    },
    onError: (err) => toast.error("Fehler beim Anlegen des Unternehmens", { description: err.message }),
  });

  const onSubmit = form.handleSubmit((data) => mutation.mutate(data));

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="firmenname"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Firmenname</FormLabel>
                <FormControl>
                  <Input className="w-full" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rechtsform"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Rechtsform</FormLabel>
                <FormControl>
                  <Input className="w-full" {...field} value={(field.value as string | undefined) ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="kundentyp"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Kundentyp</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value ?? ""}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select customer type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
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
            control={form.control}
            name="firmentyp"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Firmentyp</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value ?? ""}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select company type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {firmentypOptions.map((option) => (
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
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Website</FormLabel>
                <FormControl>
                  <Input className="w-full" {...field} value={(field.value as string | undefined) ?? ""} />
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
                <FormLabel className="text-base">Telefon</FormLabel>
                <FormControl>
                  <Input className="w-full" {...field} value={(field.value as string | undefined) ?? ""} />
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
                <FormLabel className="text-base">Email</FormLabel>
                <FormControl>
                  <Input className="w-full" type="email" {...field} value={(field.value as string | undefined) ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="strasse"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Strasse</FormLabel>
                <FormControl>
                  <Input className="w-full" {...field} value={(field.value as string | undefined) ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="plz"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Plz</FormLabel>
                <FormControl>
                  <Input className="w-full" {...field} value={(field.value as string | undefined) ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="stadt"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Stadt</FormLabel>
                <FormControl>
                  <Input className="w-full" {...field} value={(field.value as string | undefined) ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="bundesland"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Bundesland</FormLabel>
                <FormControl>
                  <Input className="w-full" {...field} value={(field.value as string | undefined) ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="land"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Land</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value ?? ""}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {landOptions.map((option) => (
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
            name="wasserdistanz"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Wasserdistanz</FormLabel>
                <FormControl>
                  <Input
                    className="w-full"
                    type="number"
                    {...field}
                    value={(field.value as number | undefined)?.toString() ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="wassertyp"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Wassertyp</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value ?? ""}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select water type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {wassertypOptions.map((option) => (
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
            name="lat"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Lat</FormLabel>
                <FormControl>
                  <Input
                    className="w-full"
                    type="number"
                    step="any"
                    {...field}
                    value={(field.value as number | undefined)?.toString() ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lon"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Lon</FormLabel>
                <FormControl>
                  <Input
                    className="w-full"
                    type="number"
                    step="any"
                    {...field}
                    value={(field.value as number | undefined)?.toString() ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="osm"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Osm</FormLabel>
                <FormControl>
                  <Input className="w-full" {...field} value={(field.value as string | undefined) ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value ?? ""}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
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
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Value</FormLabel>
                <FormControl>
                  <Input
                    className="w-full"
                    type="number"
                    {...field}
                    value={(field.value as number | undefined)?.toString() ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
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
              <FormItem className="md:col-span-2">
                <FormLabel className="text-base">Notes</FormLabel>
                <FormControl>
                  <Textarea className="w-full" {...field} value={(field.value as string | undefined) ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-4 pt-6 border-t">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Speichert..." : "Speichern"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
