"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { Company } from "@/lib/supabase/types";

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
  status: z.enum(["lead", "interessant", "qualifiziert", "akquise", "angebot", "gewonnen", "verloren", "kunde", "partner", "inaktiv"]).optional(),
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

const wassertypOptions = [
  { value: "Küste / Meer", label: "Küste / Meer" },
  { value: "Fluss", label: "Fluss" },
  { value: "Badesee", label: "Badesee" },
  { value: "See", label: "See" },
  { value: "Hafen", label: "Hafen" },
  { value: "Bach", label: "Bach" },
  { value: "Kanal", label: "Kanal" },
  { value: "Teich", label: "Teich" },
  { value: "Stausee", label: "Stausee" },
];

export default function CompanyEditForm({ company, onSuccess }: { company: Company; onSuccess?: () => void }) {
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      firmenname: company.firmenname || "",
      rechtsform: company.rechtsform || "",
      kundentyp: company.kundentyp || "",
      firmentyp: company.firmentyp || "",
      strasse: company.strasse || "",
      plz: company.plz || "",
      stadt: company.stadt || "",
      bundesland: company.bundesland || "",
      land: company.land || "Deutschland",
      website: company.website || "",
      telefon: company.telefon || "",
      email: company.email || "",
      wasserdistanz: company.wasserdistanz || 0,
      wassertyp: company.wassertyp || "",
      lat: company.lat || 0,
      lon: company.lon || 0,
      osm: company.osm || "",
      status: company.status || "lead",
      value: company.value || 0,
      notes: company.notes || "",
    },
  });

  const onSubmit = (data: CompanyFormValues) => {
    console.log("Edit submit:", data);
    onSuccess?.();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                <Input {...field} />
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
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
              <FormLabel>Firmentyp</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
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
              <FormLabel>Website</FormLabel>
              <FormControl>
                <Input {...field} />
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
                <Input {...field} />
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
                <Input type="email" {...field} />
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
              <FormLabel>Plz</FormLabel>
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
            <FormItem>
              <FormLabel>Land</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
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
              <FormLabel>Wasserdistanz</FormLabel>
              <FormControl>
                <Input
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
              <FormLabel>Wassertyp</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
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
              <FormLabel>Lat</FormLabel>
              <FormControl>
                <Input
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
              <FormLabel>Lon</FormLabel>
              <FormControl>
                <Input
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
              <FormLabel>Osm</FormLabel>
              <FormControl>
                <Input {...field} />
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
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
              <FormLabel>Value</FormLabel>
              <FormControl>
                <Input
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
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">Update Company</Button>
      </form>
    </Form>
  );
}
