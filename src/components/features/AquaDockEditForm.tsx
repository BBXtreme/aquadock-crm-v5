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
import type { Database } from "@/lib/supabase/database.types";
import { updateCompany } from "@/lib/supabase/services/companies";
import { wassertypOptions } from "@/lib/utils/water-types";

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
    .optional()
    .refine((val) => !val || OSM_REGEX.test(val.trim()), {
      message: "OSM-ID muss im Format node/12345, way/12345 oder relation/12345 sein",
    }),
});

type AquaDockFormValues = z.infer<typeof aquadockSchema>;

export default function AquaDockEditForm({ company, onSuccess }: { company: Company | null; onSuccess?: () => void }) {
  const queryClient = useQueryClient();

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
      return updateCompany(company.id, cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      if (company?.id) queryClient.invalidateQueries({ queryKey: ["company", company.id] });
      toast.success("AquaDock Daten aktualisiert");
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error("Fehler beim Speichern", { description: error.message });
    },
  });

  // Early return AFTER all hooks (AIDER RULE #2)
  if (!company) return null;

  const onSubmit = form.handleSubmit((data) => updateMutation.mutate(data));

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
          {/* existing fields unchanged */}
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

          {/* OSM FIELD WITH VALIDATION + PREVIEW */}
          <FormField
            control={form.control}
            name="osm"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>OSM ID</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="z. B. way/108139952 oder node/123456"
                    onBlur={() => field.onChange(field.value?.trim())}
                  />
                </FormControl>
                <FormMessage />
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
