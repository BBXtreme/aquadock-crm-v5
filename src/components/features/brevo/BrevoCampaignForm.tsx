// src/components/features/brevo/BrevoCampaignForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createBrevoCampaign } from "@/lib/actions/brevo";
import { type BrevoCampaignFormData, brevoCampaignSchema } from "@/lib/validations/brevo";

export default function BrevoCampaignForm() {
  const form = useForm<BrevoCampaignFormData>({ resolver: zodResolver(brevoCampaignSchema) });

  const onSubmit = async (data: BrevoCampaignFormData) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('subject', data.subject);
    formData.append('htmlContent', data.htmlContent);
    formData.append('listIds', (data.listIds as any).toString()); // Assuming listIds is array, convert to string
    if (data.scheduledAt) formData.append('scheduledAt', data.scheduledAt);
    await createBrevoCampaign(formData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control as any} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>Campaign Name</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control as any} name="subject" render={({ field }) => (
          <FormItem>
            <FormLabel>Subject</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control as any} name="htmlContent" render={({ field }) => (
          <FormItem>
            <FormLabel>HTML Content</FormLabel>
            <FormControl><Textarea {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control as any} name="listIds" render={({ field }) => (
          <FormItem>
            <FormLabel>List IDs (comma separated)</FormLabel>
            <FormControl><Input {...field} placeholder="1,2,3" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control as any} name="scheduledAt" render={({ field }) => (
          <FormItem>
            <FormLabel>Scheduled At (optional)</FormLabel>
            <FormControl><Input type="datetime-local" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit">Create Campaign</Button>
      </form>
    </Form>
  );
}
