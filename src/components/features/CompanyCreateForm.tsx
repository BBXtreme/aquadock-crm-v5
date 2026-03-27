"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BarChart, Building, MapPin, Waves } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { wassertypOptions } from "@/lib/constants"; // ← now imported (no duplication!)
import { createCompany } from "@/lib/supabase/services/companies";

const companySchema = z.object({
  firmenname: z.string().min(1, "Firmenname is required"),
  rechtsform: z.string().optional(),
  kundentyp: z.string().optional(),
  firmentyp: z.string().optional(),
  website: z.string().optional(),
  telefon: z.string().optional(),
  email: z.string().optional(),
  strasse: z.string().optional(),
  plz: z.string().optional(),
  stadt: z.string().optional(),
  bundesland: z.string().optional(),
  land: z.string().optional(),
  wasserdistanz: z.number().optional(),
  wassertyp: z.string().optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  osm: z.string().optional(),
  status: z
    .enum([
      "lead",
      "interessant",
      "qualifiziert",
      "akquise",
      "angebot",
      "gewonnen",
      "verloren",
      "kunde",
      "partner",
      "inaktiv",
    ])
    .optional(),
  value: z.number().optional(),
  notes: z.string().optional(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

const kundentypOptions = [
  { value: "restaurant", label: "Restaurant" },
  { value: "hotel", label: "Hotel" },
  { value: "resort", label: "Resort" },
  { value: "camping", label: "Camping" },
  { value: "marina", label: "Marina" },
  { value: "segelschule", label: "Segelschule" },
  { value: "segelverein", label: "Segelverein" },
  { value: "bootsverleih", label: "Bootsverleih" },
  { value: "neukunde", label: "Neukunde" },
  { value: "bestandskunde", label: "Bestandskunde" },
  { value: "interessent", label: "Interessent" },
  { value: "partner", label: "Partner" },
  { value: "sonstige", label: "Sonstige" },
];

const firmentypOptions = [
  { value: "kette", label: "Kette" },
  { value: "einzeln", label: "Einzelbetrieb" },
];

const statusOptions = [
  { value: "lead", label: "Lead" },
  { value: "interessant", label: "Interessant" },
  { value: "qualifiziert", label: "Qualifiziert" },
  { value: "akquise", label: "Akquise" },
  { value: "angebot", label: "Angebot" },
  { value: "gewonnen", label: "Gewonnen" },
  { value: "verloren", label: "Verloren" },
  { value: "kunde", label: "Kunde" },
  { value: "partner", label: "Partner" },
  { value: "inaktiv", label: "Inaktiv" },
];

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

export default function CompanyCreateForm({ onSuccess }: { onSuccess?: () => void }) {
  const queryClient = useQueryClient();

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      firmenname: "",
      rechtsform: "",
      kundentyp: "",
      firmentyp: "",
      strasse: "",
      plz: "",
      stadt: "",
      bundesland: "",
      land: "Deutschland",
      website: "",
      telefon: "",
      email: "",
      wasserdistanz: 0,
      wassertyp: "",
      lat: 0,
      lon: 0,
      osm: "",
      status: "lead",
      value: 0,
      notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: createCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company created");
      form.reset();
      onSuccess?.();
    },
    onError: (err) => toast.error("Creation failed", { description: err.message }),
  });

  const onSubmit = form.handleSubmit((data) => mutation.mutate(data));

  return (
    <div className="max-w-screen-2xl mx-auto p-6 md:p-8 lg:p-10 bg-background rounded-xl border max-h-[90vh] overflow-y-auto">
      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-8">
          {/* Firmendaten */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Building className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Firmendaten</h3>
            </div>
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
                      <Input className="w-full" {...field} />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      <Input className="w-full" {...field} />
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
                      <Input className="w-full" {...field} />
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
                      <Input className="w-full" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Adresse */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Adresse</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="strasse"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Strasse</FormLabel>
                    <FormControl>
                      <Input className="w-full" {...field} />
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
                      <Input className="w-full" {...field} />
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
                      <Input className="w-full" {...field} />
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
                      <Input className="w-full" {...field} />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
            </div>
          </div>

          {/* AquaDock Daten */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Waves className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">AquaDock Daten</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      <Input className="w-full" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* CRM Informationen */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <BarChart className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">CRM Informationen</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        onChange={(e) => field.onChange(Number(e.target.value) || 0)}
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
                      <Textarea className="w-full" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Fixed bottom buttons */}
          <div className="sticky bottom-0 left-0 right-0 bg-background border-t p-4 flex justify-end gap-4 z-10">
            <Button type="button" variant="outline" onClick={onSuccess}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Speichert..." : "Speichern"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
