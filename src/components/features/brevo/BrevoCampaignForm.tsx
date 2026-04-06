// src/components/features/brevo/BrevoCampaignForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Control } from "react-hook-form";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createBrevoCampaign } from "@/lib/actions/brevo";
import { type BrevoCampaignFormData, brevoCampaignSchema } from "@/lib/validations/brevo";

interface BrevoCampaignFormProps {
  selectedRecipients: string[];
  selectedTemplate: string;
}

const emptyCampaignDefaults: BrevoCampaignFormData = {
  name: "",
  subject: "",
  htmlContent: "",
  listIds: [],
  scheduledAt: "",
};

export default function BrevoCampaignForm({ selectedRecipients, selectedTemplate }: BrevoCampaignFormProps) {
  const form = useForm<BrevoCampaignFormData>({
    resolver: zodResolver(brevoCampaignSchema),
    defaultValues: emptyCampaignDefaults,
  });

  const onSubmit = async (data: BrevoCampaignFormData) => {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("subject", data.subject);
    formData.append("htmlContent", data.htmlContent);
    formData.append("listIds", data.listIds.join(","));
    formData.append("selectedRecipients", JSON.stringify(selectedRecipients));
    formData.append("selectedTemplate", selectedTemplate);
    if (data.scheduledAt) formData.append("scheduledAt", data.scheduledAt);

    try {
      await createBrevoCampaign(formData);
      toast.success("Campaign created successfully in Brevo!");
      form.reset(emptyCampaignDefaults);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Kampagne konnte nicht erstellt werden", { description: message });
      console.error(error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control as Control<BrevoCampaignFormData>}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Campaign Name</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control as Control<BrevoCampaignFormData>}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control as Control<BrevoCampaignFormData>}
          name="htmlContent"
          render={({ field }) => (
            <FormItem>
              <FormLabel>HTML Content</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value ?? ""} rows={6} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control as Control<BrevoCampaignFormData>}
          name="scheduledAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Scheduled At (optional)</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">Let's Create & Send Campaign</Button>
      </form>
    </Form>
  );
}
