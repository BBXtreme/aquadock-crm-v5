// src/components/features/brevo/BrevoCampaignForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createBrevoCampaign } from "@/lib/actions/brevo";
import { type BrevoCampaignForm, brevoCampaignSchema } from "@/lib/validations/brevo";

export default function BrevoCampaignForm() {
  const form = useForm<BrevoCampaignForm>({ resolver: zodResolver(brevoCampaignSchema) });

  const onSubmit = async (_data: BrevoCampaignForm) => {
    await createBrevoCampaign(new FormData()); // Pass data
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>Campaign Name</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        {/* Add other fields similarly */}
        <Button type="submit">Create Campaign</Button>
      </form>
    </Form>
  );
}
