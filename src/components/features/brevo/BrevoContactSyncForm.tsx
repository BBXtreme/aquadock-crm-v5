// src/components/features/brevo/BrevoContactSyncForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Control } from "react-hook-form";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type BrevoSyncContactsResult, syncContactsToBrevo } from "@/lib/actions/brevo";
import { kundentypOptions, statusOptions } from "@/lib/constants/company-options";
import { type BrevoSyncFormData, brevoSyncSchema } from "@/lib/validations/brevo";

const ALL_VALUE = "__all__";

function describeSyncResult(r: BrevoSyncContactsResult): string {
  const lines = [
    `${r.matched} Kontakt(e) passen zum Filter`,
    `${r.skippedNoEmail} ohne E-Mail übersprungen`,
    `${r.submitted} zur Brevo-Massenimport-API übermittelt`,
  ];
  if (r.processId != null) {
    lines.push(`Brevo-Prozess-ID ${r.processId} (Verarbeitung im Hintergrund)`);
  }
  return lines.join(" · ");
}

export default function BrevoContactSyncForm() {
  const form = useForm<BrevoSyncFormData>({
    resolver: zodResolver(brevoSyncSchema),
    defaultValues: {},
  });

  const onSubmit = async (data: BrevoSyncFormData) => {
    const formData = new FormData();
    if (data.filterKundentyp?.trim()) {
      formData.append("filterKundentyp", data.filterKundentyp.trim());
    }
    if (data.filterStatus?.trim()) {
      formData.append("filterStatus", data.filterStatus.trim());
    }
    try {
      const res = await syncContactsToBrevo(formData);
      const description = describeSyncResult(res);

      if (res.matched === 0) {
        toast.warning("Keine Kontakte zum Synchronisieren", {
          description:
            "Kein Kontakt entspricht den Filtern (Kundentyp/Status) oder du hast noch keine Kontakte in diesem Account.",
        });
        return;
      }

      if (res.submitted > 0) {
        toast.success("Brevo-Import gestartet", { description });
        return;
      }

      toast.info("Nichts an Brevo übermittelt", {
        description:
          res.skippedNoEmail > 0
            ? description
            : "Alle passenden Kontakte wurden geprüft; es gab keine Zeilen mit E-Mail zum Import.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      toast.error("Brevo-Synchronisation fehlgeschlagen", { description: message });
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Der API-Schlüssel steht in{" "}
        <span className="font-mono text-foreground">BREVO_API_KEY</span> in{" "}
        <span className="font-mono text-foreground">.env.local</span> (nach Änderung den Server neu starten).
        Verwende einen <strong>v3-API-Key</strong> aus Brevo → SMTP &amp; API → API keys (meist{" "}
        <span className="font-mono">xkeysib-</span>) — SMTP-Relay-Keys (<span className="font-mono">xsmtpsib-</span>)
        funktionieren nicht mit der REST-API.
      </p>
      <p className="text-sm text-muted-foreground border-l-2 border-primary/30 pl-3">
        <strong className="text-foreground">Nur Massen-Sync:</strong> Diese Filter legen fest, welche CRM-Kontakte
        in Brevo angelegt werden. Auf <span className="font-medium text-foreground">Brevo</span> (
        <span className="font-mono text-foreground">/brevo</span>) filterst du die Empfängertabelle separat für
        einzelne Kampagnen.
      </p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
          <FormField
            control={form.control as Control<BrevoSyncFormData>}
            name="filterKundentyp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kundentyp-Filter</FormLabel>
                <Select
                  value={field.value && field.value.length > 0 ? field.value : ALL_VALUE}
                  onValueChange={(v) => field.onChange(v === ALL_VALUE ? undefined : v)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Alle Kundentypen" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>Alle</SelectItem>
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
            control={form.control as Control<BrevoSyncFormData>}
            name="filterStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status-Filter</FormLabel>
                <Select
                  value={field.value && field.value.length > 0 ? field.value : ALL_VALUE}
                  onValueChange={(v) => field.onChange(v === ALL_VALUE ? undefined : v)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Alle Status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>Alle</SelectItem>
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
          <Button type="submit">Kontakte zu Brevo synchronisieren</Button>
        </form>
      </Form>
    </div>
  );
}
