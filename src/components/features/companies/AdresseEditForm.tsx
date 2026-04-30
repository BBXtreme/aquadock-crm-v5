// src/components/features/AdresseEditForm.tsx
// This component renders a form for editing company address data. It uses react-hook-form with zod for validation, and integrates with the Supabase backend to update company records. It also handles form state and displays success/error toasts.

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  COMPANIES_FILTER_OPTIONS_QUERY_KEY,
  useDistinctCompanyLandCodes,
} from "@/components/features/companies/use-companies-list-queries";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateCompany } from "@/lib/actions/companies";
import { buildCompanyLandSelectOptions, LAND_SELECT_CLEAR_SENTINEL } from "@/lib/countries/iso-land";
import { landFormSchema } from "@/lib/validations/company";
import type { Company, CompanyUpdate } from "@/types/database.types";

const adresseSchema = z
  .object({
    strasse: z.string().optional(),
    plz: z.string().optional(),
    stadt: z.string().optional(),
    bundesland: z.string().optional(),
    land: landFormSchema.nullish(),
  })
  .strict();

type AdresseFormValues = z.infer<typeof adresseSchema>;

export default function AdresseEditForm({
  company,
  onSuccess,
}: {
  company: Company | null;
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();
  const locale = useLocale();
  const distinctLandCodes = useDistinctCompanyLandCodes();
  const landSelectOptions = useMemo(
    () =>
      buildCompanyLandSelectOptions({
        distinctLandCodes,
        locale,
        currentLandCode: company?.land ?? undefined,
      }),
    [company?.land, distinctLandCodes, locale],
  );

  const form = useForm<AdresseFormValues>({
    resolver: zodResolver(adresseSchema),
    defaultValues: {
      strasse: company?.strasse || "",
      plz: company?.plz || "",
      stadt: company?.stadt || "",
      bundesland: company?.bundesland || "",
      land: company?.land ?? null,
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: AdresseFormValues) => {
      if (!company) throw new Error("Company is null");
      const patch: CompanyUpdate = {
        strasse: data.strasse,
        plz: data.plz,
        stadt: data.stadt,
        bundesland: data.bundesland,
        land: data.land ?? null,
      };
      return updateCompany(company.id, patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: COMPANIES_FILTER_OPTIONS_QUERY_KEY });
      if (company) {
        queryClient.invalidateQueries({ queryKey: ["company", company.id] });
      }
      queryClient.invalidateQueries({ queryKey: ["contacts", company?.id] });
      queryClient.invalidateQueries({ queryKey: ["reminders", company?.id] });
      queryClient.refetchQueries({ queryKey: ["contacts", company?.id] });
      queryClient.refetchQueries({ queryKey: ["reminders", company?.id] });
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
                  <Select
                    onValueChange={(v) =>
                      field.onChange(v === LAND_SELECT_CLEAR_SENTINEL ? null : v)
                    }
                    value={
                      field.value !== null &&
                      field.value !== undefined &&
                      field.value !== ""
                        ? field.value
                        : LAND_SELECT_CLEAR_SENTINEL
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={LAND_SELECT_CLEAR_SENTINEL}>—</SelectItem>
                      {landSelectOptions.map((option) => (
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
