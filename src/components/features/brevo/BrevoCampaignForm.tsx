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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
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

const labelClass = "text-sm font-medium";
const descriptionClass = "text-sm text-muted-foreground leading-relaxed";

const emptyCampaignDefaults: BrevoCampaignFormData = {
  name: "",
  subject: "",
  htmlContent: "",
  listIds: [],
  selectedTemplate: undefined,
  scheduledAt: "",
};

const cardClass = "border-border rounded-xl shadow-sm";

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
  const isBrevoTemplateApplied = Boolean(
    brevoOfficialTemplateId && brevoOfficialTemplateId !== BREVO_OFFICIAL_TEMPLATE_NONE,
  );
  const showTemplateFieldHighlight = isCrmTemplateApplied || isBrevoTemplateApplied;

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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card className={cardClass}>
          <CardHeader className="space-y-2 border-b border-border/60 bg-muted/20 px-6 py-6 sm:px-8">
            <CardTitle className="text-xl font-semibold tracking-tight">Vorlagen</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              CRM-Vorlagen aus dem AquaDock-Archiv oder offizielle Brevo-Templates — Auswahl füllt Betreff und Inhalt
              vor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 px-6 py-8 sm:px-8">
            <FormField
              control={form.control as Control<BrevoCampaignFormData>}
              name="selectedTemplate"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className={labelClass}>CRM-E-Mail-Vorlage</FormLabel>
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
                  <FormDescription className={descriptionClass}>
                    Nach Auswahl werden Kampagnenname, Betreff und HTML automatisch übernommen.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator className="bg-border/60" />

            <FormItem className="space-y-3">
              <FormLabel className={labelClass}>Brevo-Template (optional)</FormLabel>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="min-w-0 flex-1">
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
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue placeholder="Offizielle Brevo-Vorlage (empfohlen für Zustellrate)" />
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
                </div>
                {isBrevoTemplateApplied ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-primary/40 bg-primary/5 font-normal text-primary">
                      Brevo-Vorlage angewendet
                    </Badge>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="shrink-0"
                      onClick={() => setBrevoOfficialTemplateId(undefined)}
                    >
                      Abwählen
                    </Button>
                  </div>
                ) : null}
              </div>
              <FormDescription className={descriptionClass}>
                Aktive SMTP-Vorlagen aus Ihrem Brevo-Konto. Bei Auswahl übernimmt das Formular Betreff und HTML; beim
                Versand nutzt Brevo die Vorlagen-ID.
              </FormDescription>
              {brevoTplError ? (
                <p className="text-destructive text-sm">
                  {brevoTplQueryError instanceof Error
                    ? brevoTplQueryError.message
                    : "Brevo-Vorlagen konnten nicht geladen werden."}
                </p>
              ) : null}
            </FormItem>
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardHeader className="space-y-2 border-b border-border/60 bg-muted/20 px-6 py-6 sm:px-8">
            <CardTitle className="text-xl font-semibold tracking-tight">Kampagnendetails</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              Name, Betreff und Inhalt der E-Mail. Mit Vorlage sind die Felder hervorgehoben und vorbefüllt.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-6 py-8 sm:px-8">
            <FormField
              control={form.control as Control<BrevoCampaignFormData>}
              name="name"
              render={({ field }) => (
                <FormItem
                  className={cn(
                    "space-y-3 transition-[border-color,background-color] duration-200",
                    showTemplateFieldHighlight &&
                      "rounded-lg border border-primary/35 bg-primary/5 p-4 shadow-sm ring-1 ring-primary/10",
                  )}
                >
                  <FormLabel className={cn("inline-flex items-center gap-2", labelClass)}>
                    Kampagnenname
                    {showTemplateFieldHighlight ? (
                      <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
                    ) : null}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      className={cn(showTemplateFieldHighlight && "border-primary/30 bg-background/80")}
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
                    "space-y-3 transition-[border-color,background-color] duration-200",
                    showTemplateFieldHighlight &&
                      "rounded-lg border border-primary/35 bg-primary/5 p-4 shadow-sm ring-1 ring-primary/10",
                  )}
                >
                  <FormLabel className={cn("inline-flex items-center gap-2", labelClass)}>
                    Betreff
                    {showTemplateFieldHighlight ? (
                      <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
                    ) : null}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      className={cn(showTemplateFieldHighlight && "border-primary/30 bg-background/80")}
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
                    "space-y-3 transition-[border-color,background-color] duration-200",
                    showTemplateFieldHighlight &&
                      "rounded-lg border border-primary/35 bg-primary/5 p-4 shadow-sm ring-1 ring-primary/10",
                  )}
                >
                  <FormLabel className={cn("inline-flex items-center gap-2", labelClass)}>
                    HTML-Inhalt
                    {showTemplateFieldHighlight ? (
                      <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
                    ) : null}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      rows={8}
                      placeholder="HTML-Inhalt der Kampagne …"
                      className={cn(
                        "min-h-[10rem] resize-y",
                        showTemplateFieldHighlight && "border-primary/30 bg-background/80",
                      )}
                    />
                  </FormControl>
                  <FormDescription className={descriptionClass}>
                    Ohne Vorlage: mindestens 20 Zeichen (ohne Rand-Leerzeichen). Mit Vorlage werden Betreff und Inhalt
                    beim Speichern von der gewählten Vorlage übernommen, sofern die Kampagne diese nutzt.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator className="bg-border/60" />

            <FormField
              control={form.control as Control<BrevoCampaignFormData>}
              name="scheduledAt"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className={labelClass}>Geplanter Versand (optional)</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} value={field.value ?? ""} className="max-w-md bg-background" />
                  </FormControl>
                  <FormDescription className={descriptionClass}>
                    Leer lassen für sofortige bzw. manuelle Freigabe in Brevo.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardHeader className="space-y-2 border-b border-border/60 bg-muted/20 px-6 py-6 sm:px-8">
            <CardTitle className="text-xl font-semibold tracking-tight sm:text-2xl">Zielgruppe aus Brevo-Listen</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              Kontaktlisten aus Ihrem Brevo-Konto — optional, wenn Sie Empfänger zusätzlich oder ausschließlich im CRM
              auswählen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-6 py-8 sm:px-8">
            <FormField
              control={form.control as Control<BrevoCampaignFormData>}
              name="listIds"
              render={({ field }) => (
                <FormItem className="flex flex-col space-y-3">
                  <FormLabel className={labelClass}>Brevo-Listen</FormLabel>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="outline" className="h-10 w-full max-w-lg justify-between font-normal bg-background">
                        <span className="truncate">
                          {field.value.length === 0
                            ? "Keine Listen ausgewählt (optional)"
                            : `${field.value.length} Liste(n) gewählt`}
                        </span>
                        <ChevronDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="max-h-64 w-(--radix-dropdown-menu-trigger-width) overflow-y-auto sm:max-w-md"
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
                  <FormDescription className={descriptionClass}>
                    Optional, wenn Sie im Bereich „CRM-Kontakte“ Empfänger auswählen. Ohne CRM-Empfänger mindestens eine
                    Liste wählen.{" "}
                    <a
                      href="https://app.brevo.com/campaigns/listing"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                    >
                      Kampagnen in Brevo öffnen
                    </a>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardHeader className="space-y-2 border-b border-border/60 bg-muted/20 px-6 py-6 sm:px-8">
            <CardTitle className="text-xl font-semibold tracking-tight sm:text-2xl">Zielgruppe aus CRM-Kontakten</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              Einzelne Kontakte in der Tabelle markieren. Mindestens eine Zielquelle (Listen und/oder CRM) ist
              erforderlich.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-6 py-8 sm:px-8">
            <Badge variant="secondary" className="h-8 px-3 text-xs font-medium">
              {recipientIds.length} Empfänger ausgewählt
            </Badge>
            <BrevoRecipientSelector setSelectedRecipients={setRecipientIds} />
          </CardContent>
        </Card>

        <div className="rounded-xl border border-border bg-muted/20 p-6 shadow-sm sm:p-8">
          <Button
            type="submit"
            className="h-12 w-full text-base font-semibold shadow-sm sm:h-14 sm:text-lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Wird erstellt…" : "Kampagne in Brevo erstellen & senden"}
          </Button>
          <p className="mt-4 text-center text-sm text-muted-foreground sm:text-left">
            Die Kampagne wird in Ihrem Brevo-Konto angelegt. Status und Versand steuern Sie dort.
          </p>
        </div>
      </form>
    </Form>
  );
}
