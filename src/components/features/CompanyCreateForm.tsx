"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createCompany } from "@/lib/supabase/services/companies";
import type { CompanyInsert } from "@/lib/supabase/types";

const companySchema = z.object({
  firmenname: z.string().min(1, "Firmenname is required"),
  kundentyp: z.string().optional(),
  status: z.enum(["lead", "interessant", "qualifiziert", "akquise", "angebot", "gewonnen", "verloren"]).optional(),
  value: z.number().optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

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

interface CompanyCreateFormProps {
  onSuccess?: () => void;
}

export default function CompanyCreateForm({ onSuccess }: CompanyCreateFormProps) {
  const queryClient = useQueryClient();

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      firmenname: "",
      kundentyp: undefined,
      status: undefined,
      value: undefined,
    },
  });

  const createCompanyMutation = useMutation({
    mutationFn: async (data: CompanyInsert) => {
      return createCompany(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      form.reset();
      onSuccess?.();
    },
  });

  const onSubmit = (data: CompanyFormData) => {
    createCompanyMutation.mutate(data as CompanyInsert);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="firmenname"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Firmenname</FormLabel>
              <FormControl>
                <Input placeholder="Enter company name" {...field} />
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
                  placeholder="Enter value"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={createCompanyMutation.isPending}>
          {createCompanyMutation.isPending ? "Creating..." : "Create Company"}
        </Button>
      </form>
    </Form>
  );
}
