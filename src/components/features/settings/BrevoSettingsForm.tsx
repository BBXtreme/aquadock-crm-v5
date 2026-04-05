// src/components/features/settings/BrevoSettingsForm.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { brevoSettingsSchema, type BrevoSettingsForm } from "@/lib/validations/brevo";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export default function BrevoSettingsForm() {
  const form = useForm<BrevoSettingsForm>({ resolver: zodResolver(brevoSettingsSchema) });

  const onSubmit = async (data: BrevoSettingsForm) => {
    // Implement save logic
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="apiKey" render={({ field }) => (
          <FormItem>
            <FormLabel>API Key</FormLabel>
            <FormControl><Input {...field} type="password" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="enabled" render={({ field }) => (
          <FormItem>
            <FormLabel>Enabled</FormLabel>
            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit">Save</Button>
      </form>
    </Form>
  );
}
