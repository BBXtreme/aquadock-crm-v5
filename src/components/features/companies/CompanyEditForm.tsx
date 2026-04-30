// src/components/features/CompanyEditForm.tsx
// This component renders a form for editing company data (Firmendaten). It uses react-hook-form with zod for validation, and integrates with the Supabase backend to update company records. It also handles form state and displays success/error toasts.

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { type Control, useForm } from "react-hook-form";
import { toast } from "sonner";
import { AIEnrichButton } from "@/components/features/companies/ai-enrichment/AIEnrichButton";
import { AIEnrichmentModal } from "@/components/features/companies/ai-enrichment/AIEnrichmentModal";
import {
  COMPANIES_FILTER_OPTIONS_QUERY_KEY,
  useDistinctCompanyLandCodes,
} from "@/components/features/companies/use-companies-list-queries";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateCompanyWithOwner } from "@/lib/actions/companies";
import { wassertypOptions } from "@/lib/constants";
import { firmentypOptions, kundentypOptions, statusOptions } from "@/lib/constants/company-options";
import { buildCompanyLandSelectOptions, LAND_SELECT_CLEAR_SENTINEL } from "@/lib/countries/iso-land";
import { useT } from "@/lib/i18n/use-translations";
import { createClient } from "@/lib/supabase/browser";
import { type CompanyForm, companySchema } from "@/lib/validations/company";
import type { Database } from "@/types/database.types";

type Company = Database["public"]["Tables"]["companies"]["Row"];

const RESPONSIBLE_NONE = "__none__" as const;

type CompanyEditFormProps = {
  company: Company | null;
  onSuccess?: () => void;
  aiPrefill?: { version: number; patch: Partial<CompanyForm> } | null;
  onAiPrefillConsumed?: () => void;
  /** When set (company detail), AI research opens the parent modal instead of nesting a second dialog. */
  onRequestAiEnrich?: () => void;
};

export default function CompanyEditForm({
  company,
  onSuccess,
  aiPrefill,
  onAiPrefillConsumed,
  onRequestAiEnrich,
}: CompanyEditFormProps) {
  const queryClient = useQueryClient();
  const tCompanies = useT("companies");

  const form = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      firmenname: company?.firmenname || "",
      rechtsform: company?.rechtsform ?? null,
      kundentyp: (company?.kundentyp as CompanyForm["kundentyp"]) || "sonstige",
      firmentyp: company?.firmentyp ?? null,
      strasse: company?.strasse ?? null,
      plz: company?.plz ?? null,
      stadt: company?.stadt ?? null,
      bundesland: company?.bundesland ?? null,
      land: company?.land ?? null,
      website: company?.website ?? null,
      telefon: company?.telefon ?? null,
      email: company?.email ?? null,
      wasserdistanz: company?.wasserdistanz ?? null,
      wassertyp: company?.wassertyp ?? null,
      lat: company?.lat ?? null,
      lon: company?.lon ?? null,
      osm: company?.osm ?? null,
      status: (company?.status as CompanyForm["status"]) || "lead",
      value: company?.value ?? null,
      notes: company?.notes ?? null,
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { form: CompanyForm; userId: string | null; syncContacts: boolean }) => {
      if (!company) throw new Error("Company is null");
      const data = payload.form;
      const mappedData = {
        firmenname: data.firmenname,
        rechtsform: data.rechtsform ?? null,
        kundentyp: data.kundentyp,
        firmentyp: data.firmentyp ?? null,
        strasse: data.strasse ?? null,
        plz: data.plz ?? null,
        stadt: data.stadt ?? null,
        bundesland: data.bundesland ?? null,
        land: data.land ?? null,
        website: data.website ?? null,
        telefon: data.telefon ?? null,
        email: data.email ?? null,
        wasserdistanz: data.wasserdistanz ?? null,
        wassertyp: data.wassertyp ?? null,
        lat: data.lat ?? null,
        lon: data.lon ?? null,
        osm: data.osm ?? null,
        status: data.status,
        value: data.value ?? null,
        notes: data.notes ?? null,
      };
      return updateCompanyWithOwner({
        id: company.id,
        company: mappedData,
        user_id: payload.userId,
        sync_contact_owners: payload.syncContacts,
      });
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["companies"] });
      if (company) {
        queryClient.invalidateQueries({ queryKey: ["company", company.id] });
      }
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contacts", company?.id] });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["reminders", company?.id] });
      queryClient.invalidateQueries({ queryKey: COMPANIES_FILTER_OPTIONS_QUERY_KEY });
      toast.success(tCompanies("toastUpdated"));
      onSuccess?.();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(tCompanies("toastUpdateFailed"), { description: message });
    },
  });

  const [localAiModalOpen, setLocalAiModalOpen] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(() => company?.user_id ?? null);
  const [syncContactOwners, setSyncContactOwners] = useState(false);
  const aiEnrichViaParent = onRequestAiEnrich !== undefined;

  // biome-ignore lint/correctness/useExhaustiveDependencies: One-shot merge when parent bumps `aiPrefill.version` only.
  useEffect(() => {
    if (!company || !aiPrefill) {
      return;
    }
    const merged: CompanyForm = { ...form.getValues(), ...aiPrefill.patch };
    form.reset(merged);
    onAiPrefillConsumed?.();
  }, [aiPrefill?.version, company?.id]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Reset owner picker when server `user_id` or row changes.
  useEffect(() => {
    setSelectedOwnerId(company?.user_id ?? null);
    setSyncContactOwners(false);
  }, [company?.id, company?.user_id]);

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name")
        .order("display_name", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: company != null,
  });

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

  // Early return AFTER all hooks
  if (!company) return null;

  const onSubmit = form.handleSubmit((data) => {
    updateMutation.mutate({
      form: data as CompanyForm,
      userId: selectedOwnerId,
      syncContacts: syncContactOwners,
    });
  });

  return (
    <>
      {!aiEnrichViaParent ? (
        <AIEnrichmentModal
          company={company}
          open={localAiModalOpen}
          onOpenChange={setLocalAiModalOpen}
          onApplyPatch={(patch) => {
            const merged: CompanyForm = { ...form.getValues(), ...patch };
            form.reset(merged);
          }}
        />
      ) : null}
      <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-3 rounded-md border border-border/60 bg-muted/30 px-3 py-3">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">{tCompanies("responsibleLabel")}</Label>
            <Select
              value={selectedOwnerId ?? RESPONSIBLE_NONE}
              onValueChange={(v) => {
                setSelectedOwnerId(v === RESPONSIBLE_NONE ? null : v);
              }}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder={tCompanies("responsibleSelectPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={RESPONSIBLE_NONE}>{tCompanies("responsibleUnassigned")}</SelectItem>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.display_name?.trim() || p.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-start gap-3">
            <Checkbox
              id="sync-contacts-owner"
              checked={syncContactOwners}
              onCheckedChange={(c) => setSyncContactOwners(c === true)}
              disabled={selectedOwnerId == null || selectedOwnerId === ""}
              className="mt-0.5"
            />
            <div className="grid gap-1">
              <Label htmlFor="sync-contacts-owner" className="cursor-pointer text-sm font-medium leading-none">
                {tCompanies("syncContactsOwnerLabel")}
              </Label>
              <p className="text-xs text-muted-foreground">{tCompanies("syncContactsOwnerHint")}</p>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <AIEnrichButton
            onClick={() => {
              if (aiEnrichViaParent) {
                onRequestAiEnrich();
              } else {
                setLocalAiModalOpen(true);
              }
            }}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control as Control<CompanyForm>}
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
            control={form.control as Control<CompanyForm>}
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
            control={form.control as Control<CompanyForm>}
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
            control={form.control as Control<CompanyForm>}
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
            control={form.control as Control<CompanyForm>}
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
            control={form.control as Control<CompanyForm>}
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
            control={form.control as Control<CompanyForm>}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="text" inputMode="email" autoComplete="email" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control as Control<CompanyForm>}
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
            control={form.control as Control<CompanyForm>}
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
            control={form.control as Control<CompanyForm>}
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
            control={form.control as Control<CompanyForm>}
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
            control={form.control as Control<CompanyForm>}
            name="land"
            render={({ field }) => (
              <FormItem>
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
          <FormField
            control={form.control as Control<CompanyForm>}
            name="wasserdistanz"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Wasserdistanz (m)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control as Control<CompanyForm>}
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
            control={form.control as Control<CompanyForm>}
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
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control as Control<CompanyForm>}
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
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control as Control<CompanyForm>}
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
            control={form.control as Control<CompanyForm>}
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
            control={form.control as Control<CompanyForm>}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Value (€)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control as Control<CompanyForm>}
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
    </>
  );
}
