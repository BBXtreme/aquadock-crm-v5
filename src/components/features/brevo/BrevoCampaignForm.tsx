// src/components/features/brevo/BrevoCampaignForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { ChevronDownIcon } from "lucide-react";
import type { Control } from "react-hook-form";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createBrevoCampaign, fetchBrevoListsAction } from "@/lib/actions/brevo";
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
  selectedTemplate: undefined,
  scheduledAt: "",
};

export default function BrevoCampaignForm({ selectedRecipients, selectedTemplate }: BrevoCampaignFormProps) {
  const form = useForm<BrevoCampaignFormData>({
    resolver: zodResolver(brevoCampaignSchema),
    defaultValues: emptyCampaignDefaults,
  });

  const {
    data: brevoLists = [],
    isError: listsError,
    error: listsQueryError,
    isPending: listsPending,
  } = useQuery({
    queryKey: ["brevo-lists"],
    queryFn: () => fetchBrevoListsAction(),
    staleTime: 5 * 60 * 1000,
  });

  const sortedLists = [...brevoLists].sort((a, b) => a.name.localeCompare(b.name, "de"));

  const onSubmit = async (data: BrevoCampaignFormData) => {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("subject", data.subject);
    formData.append("htmlContent", data.htmlContent);
    formData.append("listIds", data.listIds.join(","));
    formData.append("selectedRecipients", JSON.stringify(selectedRecipients));
    const templateId = selectedTemplate.trim();
    if (templateId !== "") {
      formData.append("selectedTemplate", templateId);
    }
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
          name="listIds"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Brevo-Listen</FormLabel>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-between font-normal">
                    <span className="truncate">
                      {field.value.length === 0
                        ? "Listen wählen (optional)"
                        : `${field.value.length} Liste(n) gewählt`}
                    </span>
                    <ChevronDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-64 w-(--radix-dropdown-menu-trigger-width) overflow-y-auto" align="start">
                  <DropdownMenuLabel>Vorhandene Kontaktlisten</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {listsPending ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">Laden…</div>
                  ) : null}
                  {listsError ? (
                    <div className="px-2 py-1.5 text-sm text-destructive">
                      {listsQueryError instanceof Error
                        ? listsQueryError.message
                        : "Listen konnten nicht geladen werden."}
                    </div>
                  ) : null}
                  {!listsPending && !listsError
                    ? sortedLists.map((list) => (
                        <DropdownMenuCheckboxItem
                          key={list.id}
                          checked={field.value.includes(list.id)}
                          onCheckedChange={(checked) => {
                            const next = checked
                              ? [...new Set([...field.value, list.id])]
                              : field.value.filter((id) => id !== list.id);
                            field.onChange(next);
                          }}
                          onSelect={(e) => e.preventDefault()}
                        >
                          {list.name}
                        </DropdownMenuCheckboxItem>
                      ))
                    : null}
                </DropdownMenuContent>
              </DropdownMenu>
              <FormDescription>
                Zusätzlich zu ausgewählten Tabellen-Empfängern. Es wird mindestens eine Liste oder mindestens ein
                Empfänger benötigt.
              </FormDescription>
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
