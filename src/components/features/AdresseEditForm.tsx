"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/browser";
import type { Database } from "@/lib/supabase/database.types";
import { updateCompany } from "@/lib/supabase/services/companies";

type Company = Database["public"]["Tables"]["companies"]["Row"];

const adresseSchema = z.object({
  strasse: z.string().optional(),
  plz: z.string().optional(),
  stadt: z.string().optional(),
  bundesland: z.string().optional(),
  land: z.string().optional(),
});

type AdresseFormValues = z.infer<typeof adresseSchema>;

const landOptions = [
  { value: "Deutschland", label: "Deutschland" },
  { value: "Österreich", label: "Österreich" },
  { value: "Schweiz", label: "Schweiz" },
  { value: "Frankreich", label: "Frankreich" },
  { value: "Italien", label: "Italien" },
  { value: "Spanien", label: "Spanien" },
  { value: "Niederlande", label: "Niederlande" },
  { value: "Belgien", label: "Belgien" },
  { value: "Dänemark", label: "Dänemark" },
  { value: "Schweden", label: "Schweden" },
  { value: "Norwegen", label: "Norwegen" },
  { value: "Polen", label: "Polen" },
  { value: "Ungarn", label: "Ungarn" },
  { value: "Griechenland", label: "Griechenland" },
  { value: "Portugal", label: "Portugal" },
  { value: "Großbritannien", label: "Großbritannien" },
];

export default function AdresseEditForm({ company, onSuccess }: { company: Company | null; onSuccess?: () => void }) {
  const queryClient = useQueryClient();

  const form = useForm<AdresseFormValues>({
    resolver: zodResolver(adresseSchema),
    defaultValues: {
      strasse: company?.strasse || "",
      plz: company?.plz || "",
      stadt: company?.stadt || "",
      bundesland: company?.bundesland || "",
      land: company?.land || "Deutschland",
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: AdresseFormValues) => {
      if (!company) throw new Error("Company is null");
      return updateCompany(company.id, data as Partial<Company>, createClient());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      if (company) {
        queryClient.invalidateQueries({ queryKey: ["company", company.id] });
      }
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contacts", company?.id] });
      queryClient.invalidateQueries({ queryKey: ["reminders", company?.id] });
      toast.success("Adresse updated successfully");
      onSuccess?.();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error("Failed to update adresse", { description: message });
    },
  });

  // Early return AFTER all hooks
  if (!company) return null;

  const onSubmit = form.handleSubmit((data) => {
    updateMutation.mutate(data);
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="strasse"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Strasse</FormLabel>
                <FormControl>
                  <Input {...field} />
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
                <FormLabel>PLZ</FormLabel>
                <FormControl>
                  <Input {...field} />
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
                <FormLabel>Stadt</FormLabel>
                <FormControl>
                  <Input {...field} />
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
                <FormLabel>Bundesland</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="land"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Land</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {landOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-4 pt-6 border-t">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
