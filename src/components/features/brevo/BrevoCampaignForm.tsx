// src/components/features/brevo/BrevoCampaignForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { ChevronDownIcon, Sparkles } from "lucide-react";
import { useState } from "react";
import type { Control } from "react-hook-form";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import BrevoRecipientSelector from "@/components/features/brevo/BrevoRecipientSelector";
import BrevoTemplateSelector from "@/components/features/brevo/BrevoTemplateSelector";
import { Badge } from "@/components/ui/badge";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createBrevoCampaign, fetchBrevoListsAction, fetchBrevoTemplatesAction } from "@/lib/actions/brevo";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { type BrevoCampaignFormData, brevoCampaignSchema } from "@/lib/validations/brevo";
import type { Database } from "@/types/database.types";

type EmailTemplateRow = Database["public"]["Tables"]["email_templates"]["Row"];

const BREVO_OFFICIAL_TEMPLATE_NONE = "__brevo_official_template_none__";

interface BrevoCampaignFormProps {
  /** @deprecated Empfänger werden im Formular verwaltet; Prop wird ignoriert. */
  selectedRecipients?: string[];
  /** @deprecated Vorlage wird im Formular verwaltet; Prop bleibt für Abwärtskompatibilität. */
  selectedTemplate?: string;
}

const emptyCampaignDefaults: BrevoCampaignFormData = {
  name: "",
  subject: "",
  htmlContent: "",
  listIds: [],
  selectedTemplate: undefined,
  scheduledAt: "",
};

export default function BrevoCampaignForm(_: BrevoCampaignFormProps) {
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [brevoOfficialTemplateId, setBrevoOfficialTemplateId] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BrevoCampaignFormData>({
    resolver: zodResolver(brevoCampaignSchema),
    defaultValues: emptyCampaignDefaults,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["email-templates", "brevo-campaign"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("email_templates").select("*");
      if (error) throw error;
      return (data ?? []) as EmailTemplateRow[];
    },
    staleTime: 5 * 60 * 1000,
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

  const {
    data: brevoOfficialTemplates = [],
    isError: brevoTplError,
    error: brevoTplQueryError,
    isPending: brevoTplPending,
  } = useQuery({
    queryKey: ["brevo-official-templates"],
    queryFn: () => fetchBrevoTemplatesAction(),
    staleTime: 5 * 60 * 1000,
  });

  const sortedLists = [...brevoLists].sort((a, b) => a.name.localeCompare(b.name, "de"));

  const isCrmTemplateApplied = Boolean(form.watch("selectedTemplate"));

  const onSubmit = async (data: BrevoCampaignFormData) => {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("subject", data.subject ?? "");
    formData.append("htmlContent", data.htmlContent ?? "");
    formData.append("listIds", data.listIds.join(","));
    formData.append("selectedRecipients", JSON.stringify(recipientIds));
    const trimmedTemplate = data.selectedTemplate?.trim();
    if (trimmedTemplate && trimmedTemplate.length > 0) {
      formData.append("selectedTemplate", trimmedTemplate);
    }
    const trimmedBrevoTpl = brevoOfficialTemplateId?.trim();
    if (trimmedBrevoTpl && trimmedBrevoTpl.length > 0) {
      formData.append("brevoOfficialTemplateId", trimmedBrevoTpl);
    }
    if (data.scheduledAt) formData.append("scheduledAt", data.scheduledAt);

    setIsSubmitting(true);
    try {
      await createBrevoCampaign(formData);
      const nameForToast = data.name.trim() || "Kampagne";
      toast.success(`„${nameForToast}“ wurde an Brevo übermittelt.`, {
        description:
          "Die Kampagne wurde in Ihrem Brevo-Konto angelegt bzw. zur Auslieferung eingeplant. Sie können den Status in Brevo verfolgen.",
      });
      form.reset(emptyCampaignDefaults);
      setRecipientIds([]);
      setBrevoOfficialTemplateId(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      toast.error("Kampagne konnte nicht erstellt werden", { description: message });
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control as Control<BrevoCampaignFormData>}
          name="selectedTemplate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CRM-E-Mail-Vorlage</FormLabel>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="min-w-0 flex-1">
                  <BrevoTemplateSelector
                    templates={templates}
                    value={field.value ?? null}
                    onChange={(id) => {
                      field.onChange(id ? id : undefined);
                      if (id) {
                        setBrevoOfficialTemplateId(undefined);
                      }
                      const t = templates.find((row) => row.id === id);
                      if (t) {
                        form.setValue("name", t.name);
                        form.setValue("subject", t.subject);
                        form.setValue("htmlContent", t.body);
                      }
                    }}
                    placeholder="Vorlage wählen (optional)"
                  />
                </div>
                {field.value ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-primary/40 bg-primary/5 font-normal text-primary">
                      Vorlage angewendet
                    </Badge>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="shrink-0"
                      onClick={() => field.onChange(undefined)}
                    >
                      Abwählen
                    </Button>
                  </div>
                ) : null}
              </div>
              <FormDescription>Vorlage wählen → Formular wird automatisch ausgefüllt</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormItem>
          <FormLabel>Brevo Template (optional)</FormLabel>
          <Select
            value={brevoOfficialTemplateId ?? BREVO_OFFICIAL_TEMPLATE_NONE}
            onValueChange={(value) => {
              if (value === BREVO_OFFICIAL_TEMPLATE_NONE) {
                setBrevoOfficialTemplateId(undefined);
                return;
              }
              setBrevoOfficialTemplateId(value);
              form.setValue("selectedTemplate", undefined);
              const t = brevoOfficialTemplates.find((row) => row.id === value);
              if (t) {
                form.setValue("subject", t.subject);
                form.setValue("htmlContent", t.htmlContent);
              }
            }}
            disabled={brevoTplPending}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Offizielle Brevo-Vorlage wählen (empfohlen für bessere Zustellrate)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={BREVO_OFFICIAL_TEMPLATE_NONE}>Keine Brevo-Vorlage</SelectItem>
              {brevoOfficialTemplates.map((row) => (
                <SelectItem key={row.id} value={row.id}>
                  {row.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormDescription>
            Aktive SMTP-Vorlagen aus Ihrem Brevo-Konto. Bei Auswahl werden Betreff und HTML zur Vorschau übernommen;
            beim Senden nutzt Brevo die Vorlagen-ID (bessere Zustellung als reines HTML).
          </FormDescription>
          {brevoTplError ? (
            <p className="text-destructive text-sm">
              {brevoTplQueryError instanceof Error ? brevoTplQueryError.message : "Brevo-Vorlagen konnten nicht geladen werden."}
            </p>
          ) : null}
        </FormItem>
        <FormField
          control={form.control as Control<BrevoCampaignFormData>}
          name="name"
          render={({ field }) => (
            <FormItem
              className={cn(
                "transition-[border-color,background-color] duration-200",
                isCrmTemplateApplied &&
                  "rounded-lg border border-primary/35 bg-primary/5 p-3 shadow-sm ring-1 ring-primary/10",
              )}
            >
              <FormLabel className="inline-flex items-center gap-1.5">
                Campaign Name
                {isCrmTemplateApplied ? (
                  <Sparkles className="size-3.5 shrink-0 text-primary" aria-hidden />
                ) : null}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  className={cn(isCrmTemplateApplied && "border-primary/30 bg-background/80")}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control as Control<BrevoCampaignFormData>}
          name="subject"
          render={({ field }) => (
            <FormItem
              className={cn(
                "transition-[border-color,background-color] duration-200",
                isCrmTemplateApplied &&
                  "rounded-lg border border-primary/35 bg-primary/5 p-3 shadow-sm ring-1 ring-primary/10",
              )}
            >
              <FormLabel className="inline-flex items-center gap-1.5">
                Subject
                {isCrmTemplateApplied ? (
                  <Sparkles className="size-3.5 shrink-0 text-primary" aria-hidden />
                ) : null}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  className={cn(isCrmTemplateApplied && "border-primary/30 bg-background/80")}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control as Control<BrevoCampaignFormData>}
          name="htmlContent"
          render={({ field }) => (
            <FormItem
              className={cn(
                "transition-[border-color,background-color] duration-200",
                isCrmTemplateApplied &&
                  "rounded-lg border border-primary/35 bg-primary/5 p-3 shadow-sm ring-1 ring-primary/10",
              )}
            >
              <FormLabel className="inline-flex items-center gap-1.5">
                HTML Content
                {isCrmTemplateApplied ? (
                  <Sparkles className="size-3.5 shrink-0 text-primary" aria-hidden />
                ) : null}
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  rows={6}
                  placeholder="Geben Sie hier den HTML-Inhalt der Kampagne ein..."
                  className={cn(isCrmTemplateApplied && "border-primary/30 bg-background/80")}
                />
              </FormControl>
              <FormDescription>
                Ohne Vorlage: mindestens 20 Zeichen (Leerzeichen am Rand zählen nicht). Mit Vorlage werden Betreff und
                HTML beim Speichern von der Vorlage übernommen, falls die Kampagne sie nutzt.
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
        <div className="space-y-4 rounded-lg border border-border/70 bg-muted/25 p-5">
          <div className="space-y-1">
            <h3 className="text-base font-semibold tracking-tight">Zielgruppe aus Brevo-Listen</h3>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Kontaktlisten aus Brevo — optional, wenn Sie Empfänger im CRM-Bereich auswählen.
            </p>
          </div>
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
                          ? "Keine Listen ausgewählt (optional)"
                          : `${field.value.length} Liste(n) gewählt`}
                      </span>
                      <ChevronDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="max-h-64 w-(--radix-dropdown-menu-trigger-width) overflow-y-auto"
                    align="start"
                  >
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
                Optional, wenn Sie im Bereich „CRM-Kontakte“ Empfänger auswählen. Ohne CRM-Empfänger mindestens eine
                Liste wählen.{" "}
                <a
                  href="https://app.brevo.com/campaigns/listing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-4 hover:text-primary"
                >
                  app.brevo.com/campaigns/listing
                </a>
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        </div>
        <div className="space-y-4 rounded-lg border border-border/70 bg-muted/25 p-5">
          <div className="space-y-1">
            <h3 className="text-base font-semibold tracking-tight">Zielgruppe aus CRM-Kontakten</h3>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Einzelne Kontakte in der Tabelle markieren; mindestens eine Zielgruppe (Listen oder CRM) ist erforderlich.
            </p>
          </div>
          <Badge variant="secondary" className="font-normal">
            {recipientIds.length} Empfänger ausgewählt
          </Badge>
          <BrevoRecipientSelector setSelectedRecipients={setRecipientIds} />
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Wird erstellt…" : "Kampagne in Brevo erstellen & senden"}
        </Button>
      </form>
    </Form>
  );
}
