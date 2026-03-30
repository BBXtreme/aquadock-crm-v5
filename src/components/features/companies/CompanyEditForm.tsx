// src/components/features/CompanyEditForm.tsx
// This component renders a form for editing company data (Firmendaten). It uses react-hook-form with zod for validation, and integrates with the Supabase backend to update company records. It also handles form state and displays success/error toasts.

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
import { Textarea } from "@/components/ui/textarea";
import { wassertypOptions } from "@/lib/constants";
import { firmentypOptions, kundentypOptions, landOptions, statusOptions } from "@/lib/constants/company-options";
import type { CompanyFormDTO } from "@/lib/dto/company.dto";
import { createClient } from "@/lib/supabase/browser-client";
import type { Database } from "@/lib/supabase/database.types";
import { updateCompany } from "@/lib/supabase/services/companies";

type Company = Database["public"]["Tables"]["companies"]["Row"];

const companySchema = z.object({
  firmenname: z.string().min(1, "Firmenname is required"),
  rechtsform: z.string().nullable().optional(),
  kundentyp: z.string(),
  firmentyp: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  telefon: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  strasse: z.string().nullable().optional(),
  plz: z.string().nullable().optional(),
  stadt: z.string().nullable().optional(),
  bundesland: z.string().nullable().optional(),
  land: z.string().nullable().optional(),
  wasserdistanz: z.number().nullable().optional(),
  wassertyp: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lon: z.number().nullable().optional(),
  osm: z.string().nullable().optional(),
  status: z.enum(["lead", "interessant", "qualifiziert", "akquise", "angebot", "gewonnen", "verloren"]),
  value: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export default function CompanyEditForm({ company, onSuccess }: { company: Company | null; onSuccess?: () => void }) {
  const queryClient = useQueryClient();

  const form = useForm<CompanyFormDTO>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      firmenname: company?.firmenname || "",
      rechtsform: company?.rechtsform ?? undefined,
      kundentyp: company?.kundentyp || "",
      firmentyp: company?.firmentyp ?? undefined,
      strasse: company?.strasse ?? undefined,
      plz: company?.plz ?? undefined,
      stadt: company?.stadt ?? undefined,
      bundesland: company?.bundesland ?? undefined,
      land: company?.land ?? undefined,
      website: company?.website ?? undefined,
      telefon: company?.telefon ?? undefined,
      email: company?.email ?? undefined,
      wasserdistanz: company?.wasserdistanz ?? undefined,
      wassertyp: company?.wassertyp ?? undefined,
      lat: company?.lat ?? undefined,
      lon: company?.lon ?? undefined,
      osm: company?.osm ?? undefined,
      status: (company?.status as CompanyFormDTO["status"]) || "lead",
      value: company?.value ?? undefined,
      notes: company?.notes ?? undefined,
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: CompanyFormDTO) => {
      if (!company) throw new Error("Company is null");
      const mappedData = {
        firmenname: data.firmenname,
        rechtsform: data.rechtsform ?? undefined,
        kundentyp: data.kundentyp,
        firmentyp: data.firmentyp ?? undefined,
        strasse: data.strasse ?? undefined,
        plz: data.plz ?? undefined,
        stadt: data.stadt ?? undefined,
        bundesland: data.bundesland ?? undefined,
        land: data.land ?? undefined,
        website: data.website ?? undefined,
        telefon: data.telefon ?? undefined,
        email: data.email ?? undefined,
        wasserdistanz: data.wasserdistanz ?? undefined,
        wassertyp: data.wassertyp ?? undefined,
        lat: data.lat ?? undefined,
        lon: data.lon ?? undefined,
        osm: data.osm ?? undefined,
        status: data.status,
        value: data.value ?? undefined,
        notes: data.notes ?? undefined,
      };
      return updateCompany(company.id, mappedData, createClient());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      if (company) {
        queryClient.invalidateQueries({ queryKey: ["company", company.id] });
      }
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contacts", company?.id] });
      queryClient.invalidateQueries({ queryKey: ["reminders", company?.id] });
      toast.success("Company updated successfully");
      onSuccess?.();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error("Failed to update company", { description: message });
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
            name="firmenname"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Firmenname</FormLabel>
                <FormControl>
                  <Input {...field} />
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
                <FormLabel>Rechtsform</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
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
                <FormLabel>Kundentyp</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer type" />
                    </SelectTrigger>
                    <SelectContent>
                      {kundentypOptions.map((option) => (
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
          <FormField
            control={form.control}
            name="firmentyp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Firmentyp</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select company type" />
                    </SelectTrigger>
                    <SelectContent>
                      {firmentypOptions.map((option) => (
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
          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
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
                  <Input {...field} value={field.value ?? ""} />
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
                  <Input type="email" {...field} value={field.value ?? ""} />
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
                <FormLabel>Strasse</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
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
                  <Input {...field} value={field.value ?? ""} />
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
                  <Input {...field} value={field.value ?? ""} />
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
                  <Input {...field} value={field.value ?? ""} />
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
                <FormLabel>Land</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
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
          <FormField
            control={form.control}
            name="wasserdistanz"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Wasserdistanz (m)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    value={field.value ?? ""}
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
                <FormLabel>Wassertyp</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select water type" />
                    </SelectTrigger>
                    <SelectContent>
                      {wassertypOptions.map((option) => (
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
          <FormField
            control={form.control}
            name="lat"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Latitude</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="any"
                    min="-90"
                    max="90"
                    {...field}
                    value={field.value ?? ""}
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
                <FormLabel>Longitude</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="any"
                    min="-180"
                    max="180"
                    {...field}
                    value={field.value ?? ""}
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
                <FormLabel>OSM ID</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
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
                <FormLabel>Status</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
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
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Value (€)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    value={field.value ?? ""}
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
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea {...field} value={field.value ?? ""} />
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
