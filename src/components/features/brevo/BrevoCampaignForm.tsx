// src/components/features/brevo/BrevoCampaignForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { brevoCampaignSchema, type BrevoCampaignForm } from "@/lib/validations/brevo";
import { createBrevoCampaign } from "@/lib/actions/brevo";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function BrevoCampaignForm() {
  const form = useForm<BrevoCampaignForm>({ resolver: zodResolver(brevoCampaignSchema) });

  const onSubmit = async (data: BrevoCampaignForm) => {
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
