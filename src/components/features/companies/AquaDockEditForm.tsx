// src/components/features/AquaDockEditForm.tsx
// This component renders a form for editing AquaDock-related data for a company. It uses react-hook-form with zod for validation, and integrates with the Supabase backend to update company records. It also includes live validation of OSM IDs using the Overpass API, and displays success/error toasts.

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateCompany } from "@/lib/actions/companies";
import { wassertypOptions } from "@/lib/constants";
import { createClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database.types";

type Company = Database["public"]["Tables"]["companies"]["Row"];

// ==================== OSM VALIDATION ====================
const OSM_REGEX = /^(node|way|relation)\/\d+$/;

const aquadockSchema = z.object({
  wasserdistanz: z.number().optional(),
  wassertyp: z.string().optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  osm: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || OSM_REGEX.test(val), {
      message: "OSM-ID muss im Format node/12345, way/12345 oder relation/12345 sein",
    }),
});

type AquaDockFormValues = z.infer<typeof aquadockSchema>;

export default function AquaDockEditForm({ company, onSuccess }: { company: Company | null; onSuccess?: () => void }) {
  const queryClient = useQueryClient();

  // Live Overpass Validation State
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    message: string;
    lat?: number;
    lon?: number;
  } | null>(null);

  const form = useForm<AquaDockFormValues>({
    resolver: zodResolver(aquadockSchema),
    defaultValues: {
      wasserdistanz: company?.wasserdistanz ?? undefined,
      wassertyp: company?.wassertyp ?? "",
      lat: company?.lat ?? undefined,
      lon: company?.lon ?? undefined,
      osm: company?.osm ?? "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: AquaDockFormValues) => {
      if (!company?.id) throw new Error("Company ID ist erforderlich");
      // Trim OSM before sending
      const cleanData = {
        ...data,
        osm: data.osm?.trim() || null,
      };
      return updateCompany(company.id, cleanData, createClient());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      if (company?.id) queryClient.invalidateQueries({ queryKey: ["company", company.id] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contacts", company?.id] });
      queryClient.invalidateQueries({ queryKey: ["reminders", company?.id] });
      toast.success("AquaDock Daten aktualisiert");
      onSuccess?.();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Fehler beim Speichern", { description: message });
    },
  });

  // Early return AFTER all hooks (AIDER RULE #2)
  if (!company) return null;

  const onSubmit = form.handleSubmit((data) => updateMutation.mutate(data));

  // Live Overpass Validation
  const validateOsmId = async () => {
    const osmValue = form.getValues("osm")?.trim();
    if (!osmValue || !OSM_REGEX.test(osmValue)) {
      setValidationResult({ valid: false, message: "Ungültiges OSM-Format" });
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      const query = `[out:json][timeout:10];${osmValue};out center;`;
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: `data=${encodeURIComponent(query)}`,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      if (!res.ok) throw new Error("Overpass API nicht erreichbar");

      const data = await res.json();

      if (data.elements && data.elements.length > 0) {
        const element = data.elements[0];
        const lat = element.center?.lat ?? element.lat;
        const lon = element.center?.lon ?? element.lon;

        setValidationResult({
          valid: true,
          message: `✅ Gefunden: ${element.type}/${element.id}`,
          lat: lat ? Number(lat) : undefined,
          lon: lon ? Number(lon) : undefined,
        });

        toast.success("OSM-ID erfolgreich validiert");
      } else {
        setValidationResult({ valid: false, message: "❌ OSM-Element nicht gefunden" });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      setValidationResult({ valid: false, message: `Fehler: ${message}` });
    } finally {
      setIsValidating(false);
    }
  };

  const applyLatLonFromValidation = () => {
    if (!validationResult?.lat || !validationResult?.lon) return;
    form.setValue("lat", validationResult.lat);
    form.setValue("lon", validationResult.lon);
    toast.success("Lat/Lon übernommen");
    setValidationResult(null);
  };

  // Live preview of OSM link
  const osmValue = form.watch("osm")?.trim();
  const previewUrl =
    osmValue && OSM_REGEX.test(osmValue)
      ? `https://www.openstreetmap.org/${osmValue}#map=17/${(company.lat ?? 50.43).toFixed(5)}/${(company.lon ?? 9.18).toFixed(5)}`
      : null;

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Wassertyp auswählen" />
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

          {/* OSM FIELD WITH LIVE OVERPASS VALIDATION */}
          <FormField
            control={form.control}
            name="osm"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>OSM ID</FormLabel>
                <div className="flex gap-2">
                  <FormControl className="flex-1">
                    <Input
                      {...field}
                      placeholder="z. B. way/108139952 oder node/123456"
                      onBlur={() => field.onChange(field.value?.trim())}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={validateOsmId}
                    disabled={isValidating || !form.getValues("osm")}
                  >
                    {isValidating ? "Prüfe…" : "OSM-ID prüfen"}
                  </Button>
                </div>

                <FormMessage />

                {/* Validation Result */}
                {validationResult && (
                  <div className="mt-3 p-3 rounded-lg border text-sm">
                    <p className={validationResult.valid ? "text-green-600" : "text-red-600"}>
                      {validationResult.message}
                    </p>
                    {validationResult.valid && validationResult.lat && validationResult.lon && (
                      <div className="mt-2 flex items-center gap-3">
                        <span className="text-xs text-gray-500">
                          Lat: {validationResult.lat.toFixed(5)} • Lon: {validationResult.lon.toFixed(5)}
                        </span>
                        <Button type="button" size="sm" variant="secondary" onClick={applyLatLonFromValidation}>
                          Lat/Lon übernehmen
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Preview Link */}
                {previewUrl && (
                  <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                    <span>🗺 Vorschau:</span>
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline font-mono"
                    >
                      {field.value}
                    </a>
                  </p>
                )}

                <p className="text-xs text-gray-500 mt-1">
                  Format: <span className="font-mono">node/12345</span> • <span className="font-mono">way/12345</span> •{" "}
                  <span className="font-mono">relation/12345</span>
                </p>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-4 pt-6 border-t">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Wird gespeichert..." : "Änderungen speichern"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
