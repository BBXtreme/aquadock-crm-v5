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

type Company = Database["public"]["Tables"]["companies"]["Row"];

const aquadockSchema = z.object({
  wasserdistanz: z.number().optional(),
  wassertyp: z.string().optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  osm: z.string().optional(),
});

type AquaDockFormValues = z.infer<typeof aquadockSchema>;

const wassertypOptions = [
  /* your array from before – unchanged */
];

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
      if (!company?.id) throw new Error("Company ID is required");
      return updateCompany(company.id, data);
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

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        {/* your existing FormFields – unchanged */}
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
