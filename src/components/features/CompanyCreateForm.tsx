"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const companySchema = z.object({
  firmenname: z.string().min(1, "Firmenname is required"),
  kundentyp: z.string().optional(),
  status: z.enum(["lead", "interessant", "qualifiziert", "akquise", "angebot", "gewonnen", "verloren"]).optional(),
  value: z.number().optional(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

const kundentypOptions = [
  { value: "restaurant", label: "Restaurant" },
  { value: "hotel", label: "Hotel" },
  { value: "marina", label: "Marina" },
  { value: "camping", label: "Camping" },
  { value: "sonstige", label: "Sonstige" },
];

const statusOptions = [
  { value: "lead", label: "Lead" },
  { value: "interessant", label: "Interessant" },
  { value: "qualifiziert", label: "Qualifiziert" },
  { value: "akquise", label: "Akquise" },
  { value: "angebot", label: "Angebot" },
  { value: "gewonnen", label: "Gewonnen" },
  { value: "verloren", label: "Verloren" },
];

export default function CompanyCreateForm({ onSuccess }: { onSuccess?: () => void }) {
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema as any),
    defaultValues: {
      firmenname: "",
      kundentyp: "",
      status: "lead",
      value: 0,
    },
  });

  const onSubmit = (data: CompanyFormValues) => {
    console.log("Submit:", data); // replace with mutation later
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
              <FormLabel>Firmenname *</FormLabel>
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
              <FormLabel>Value (€)</FormLabel>
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

        <Button type="submit">Create Company</Button>
      </form>
    </Form>
  );
}
