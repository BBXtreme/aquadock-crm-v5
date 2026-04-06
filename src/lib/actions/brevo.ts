// src/lib/actions/brevo.ts
"use server";

import { requireUser } from "@/lib/auth/require-user";
import type { BrevoListSummary } from "@/lib/services/brevo";
import {
  addContactToList,
  createBrevoList,
  fetchBrevoLists,
  fetchBrevoTemplates,
  importBrevoContactsBulk,
  mapBrevoClientError,
  sendBrevoCampaign,
} from "@/lib/services/brevo";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  brevoCampaignSchema,
  brevoSelectedRecipientsSchema,
  brevoSyncSchema,
} from "@/lib/validations/brevo";
import type { BrevoContactWithCompany } from "@/types/brevo";

type BrevoCampaign = {
  id: number;
  name: string;
  subject?: string;
  status: string;
  createdAt: string;
};

/** Result of `syncContactsToBrevo` for UI toasts (counts). */
export type BrevoSyncContactsResult = {
  /** Contacts matching CRM + filters */
  matched: number;
  /** In matched set but no usable e-mail */
  skippedNoEmail: number;
  /** Contacts submitted in one bulk import (with e-mail) */
  submitted: number;
  /** Brevo async import job id; omitted when nothing was submitted */
  processId?: number;
};

function parseSelectedRecipientsFromForm(data: Record<string, FormDataEntryValue>): string[] | null {
  const raw = data.selectedRecipients;
  if (raw == null || raw === "") return null;
  if (typeof raw !== "string") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const result = brevoSelectedRecipientsSchema.safeParse(parsed);
  return result.success ? result.data : null;
}

/**
 * `listIds.join(",")` from the client yields `""` when none selected; `"".split(",").map(Number)` wrongly becomes `[0]`.
 * Only accept positive integer list ids Brevo accepts.
 */
function parseBrevoListIdsFromForm(value: unknown): number[] {
  if (value == null || value === "") return [];
  if (typeof value !== "string") return [];
  const ids = value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n > 0);
  return [...new Set(ids)];
}

function parseBrevoOfficialTemplateId(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  const n = Number.parseInt(trimmed, 10);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

export async function syncContactsToBrevo(formData: FormData): Promise<BrevoSyncContactsResult> {
  const user = await requireUser();
  const data = Object.fromEntries(formData);
  const validated = brevoSyncSchema.parse(data);

  const supabase = await createServerSupabaseClient();

  const { data: contacts } = await supabase
    .from("contacts")
    .select("*, companies(kundentyp, status)")
    .eq("user_id", user.id);

  // Type contacts explicitly to avoid implicit any on contact parameter
  const typedContacts: BrevoContactWithCompany[] = contacts ?? [];

  const filteredContacts = typedContacts.filter((contact) => {
    if (validated.filterKundentyp && contact.companies?.kundentyp !== validated.filterKundentyp) return false;
    if (validated.filterStatus && contact.companies?.status !== validated.filterStatus) return false;
    return true;
  });

  const skippedNoEmail = filteredContacts.filter((c) => !c.email?.trim()).length;
  const jsonBody = filteredContacts
    .map((contact) => {
      const email = contact.email?.trim();
      if (!email) return null;
      return {
        email,
        attributes: { vorname: contact.vorname, nachname: contact.nachname },
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const result: BrevoSyncContactsResult = {
    matched: filteredContacts.length,
    skippedNoEmail,
    submitted: jsonBody.length,
  };

  if (jsonBody.length === 0) {
    return result;
  }

  const listName = `AquaDock CRM Sync ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;

  try {
    const { processId } = await importBrevoContactsBulk({
      jsonBody,
      newList: { listName, folderId: 1 },
      updateExistingContacts: true,
    });
    return { ...result, processId };
  } catch (err) {
    console.error("Brevo sync error:", err);
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("Kontakte konnten nicht zu Brevo synchronisiert werden.");
  }
}

export async function createBrevoCampaign(formData: FormData) {
  const user = await requireUser();
  const data = Object.fromEntries(formData);

  const selectedRecipients = parseSelectedRecipientsFromForm(data);
  const selectedTemplate = data.selectedTemplate as string;

  const validated = brevoCampaignSchema.parse({
    name: data.name,
    subject: data.subject,
    htmlContent: data.htmlContent,
    listIds: parseBrevoListIdsFromForm(data.listIds),
    selectedTemplate,
    scheduledAt: data.scheduledAt,
  });

  const supabase = await createServerSupabaseClient();

  // Template override (if selected) — visibility enforced by RLS on email_templates (no user_id column)
  if (selectedTemplate) {
    const { data: template } = await supabase
      .from("email_templates")
      .select("*")
      .eq("id", selectedTemplate)
      .maybeSingle();

    if (template) {
      validated.name = template.name;
      validated.subject = template.subject;
      validated.htmlContent = template.body;
    }
  }

  let finalListIds = [...validated.listIds];

  const recipientIds = selectedRecipients ?? [];
  const hasRecipients = recipientIds.length > 0;
  const hasListIds = finalListIds.length > 0;
  if (!hasRecipients && !hasListIds) {
    throw new Error(
      "Keine Zielgruppe: Bitte wählen Sie mindestens eine Brevo-Kontaktliste (Dropdown) oder markieren Sie mindestens einen Empfänger in der CRM-Kontakttabelle. Ohne eine dieser Angaben kann die Kampagne nicht an Brevo übermittelt werden.",
    );
  }

  try {
    if (hasRecipients) {
      if (!hasListIds) {
        const listName = `${validated.name} Recipients`;
        const list = await createBrevoList(listName);
        const listId = list.id;

        for (const id of recipientIds) {
          const { data: contact } = await supabase
            .from("contacts")
            .select("email")
            .eq("id", id)
            .eq("user_id", user.id)
            .maybeSingle();
          if (contact?.email) {
            await addContactToList(listId, contact.email);
          }
        }
        finalListIds = [listId];
      } else {
        for (const id of recipientIds) {
          const { data: contact } = await supabase
            .from("contacts")
            .select("email")
            .eq("id", id)
            .eq("user_id", user.id)
            .maybeSingle();
          if (!contact?.email) continue;
          for (const listId of finalListIds) {
            await addContactToList(listId, contact.email);
          }
        }
      }
    }

    const brevoTemplateId = parseBrevoOfficialTemplateId(data.brevoOfficialTemplateId);

    const campaign = await sendBrevoCampaign({
      name: validated.name,
      subject: validated.subject,
      htmlContent: validated.htmlContent,
      listIds: finalListIds,
      scheduledAt: validated.scheduledAt,
      ...(brevoTemplateId != null ? { templateId: brevoTemplateId } : {}),
    });

    await supabase.from("email_log").insert({
      recipient_email: "campaign@brevo.com",
      subject: validated.subject,
      template_name: "Brevo Campaign",
      status: "sent",
      user_id: user.id,
    });

    if (recipientIds.length > 0) {
      const { data: contactsForTimeline, error: contactsTimelineError } = await supabase
        .from("contacts")
        .select("id, company_id")
        .in("id", recipientIds)
        .eq("user_id", user.id);

      if (contactsTimelineError) {
        console.error("Contacts load for timeline after campaign:", contactsTimelineError);
      } else if (contactsForTimeline && contactsForTimeline.length > 0) {
        const description = `Kampagne „${validated.name}“ wurde gesendet.`;
        const timelineRows = contactsForTimeline.map((c) => ({
          activity_type: "email",
          title: "Kampagne gesendet",
          content: description,
          contact_id: c.id,
          company_id: c.company_id,
          user_id: user.id,
          created_by: user.id,
          user_name: user.display_name,
        }));
        const { error: timelineError } = await supabase.from("timeline").insert(timelineRows);
        if (timelineError) {
          console.error("Timeline insert after campaign:", timelineError);
        }
      }
    }

    return campaign;
  } catch (err) {
    console.error("Brevo campaign creation error:", err);
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("Brevo-Kampagne konnte nicht erstellt werden.");
  }
}

/**
 * Lists campaigns for the shared `BREVO_API_KEY` account (single-tenant Brevo).
 * Any authenticated CRM user with access to /brevo sees the same list.
 */
export async function fetchBrevoListsAction(): Promise<BrevoListSummary[]> {
  await requireUser();
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error(
      "BREVO_API_KEY fehlt: in .env.local setzen und Server neu starten (Einstellungen → Brevo).",
    );
  }
  try {
    return await fetchBrevoLists();
  } catch (err) {
    console.error("Failed to fetch Brevo lists:", err);
    throw mapBrevoClientError(err);
  }
}

/** Brevo transactional (SMTP) template row for campaign form (`fetchBrevoTemplatesAction`). */
export type BrevoOfficialTemplateSummary = {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
};

/** Active Brevo SMTP templates (`transactionalEmails.getSmtpTemplates`) for campaign `templateId`. */
export async function fetchBrevoTemplatesAction(): Promise<BrevoOfficialTemplateSummary[]> {
  await requireUser();
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error(
      "BREVO_API_KEY fehlt: in .env.local setzen und Server neu starten (Einstellungen → Brevo).",
    );
  }
  try {
    const rows = await fetchBrevoTemplates();
    return rows.map((t) => ({
      id: String(t.id),
      name: t.name,
      subject: t.subject,
      htmlContent: t.htmlContent,
    }));
  } catch (err) {
    console.error("Failed to fetch Brevo templates:", err);
    throw mapBrevoClientError(err);
  }
}

export async function fetchBrevoCampaignsAction(): Promise<BrevoCampaign[]> {
  await requireUser();
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error(
      "BREVO_API_KEY fehlt: in .env.local setzen und Server neu starten (Einstellungen → Brevo).",
    );
  }
  const { BrevoClient, logging } = await import("@getbrevo/brevo");
  const brevo = new BrevoClient({
    apiKey,
    timeoutInSeconds: 30,
    maxRetries: 3,
    logging: { level: logging.LogLevel.Warn, logger: new logging.ConsoleLogger() },
  });
  try {
    const response = await brevo.emailCampaigns.getEmailCampaigns();
    return (response.campaigns || []).map((c) => ({
      id: c.id,
      name: c.name,
      subject: c.subject || "",
      status: c.status,
      createdAt: c.createdAt,
    }));
  } catch (err) {
    console.error("Failed to fetch Brevo campaigns:", err);
    throw mapBrevoClientError(err);
  }
}

/** Per-campaign metrics from Brevo `globalStats` (last ~6 months of events per Brevo docs). */
export type BrevoCampaignStatsRow = {
  id: number;
  name: string;
  status: string;
  sent: number;
  delivered: number;
  uniqueViews: number;
  uniqueClicks: number;
  opensRatePercent: number | null;
  clickRatePercent: number | null;
  complaints: number;
  unsubscriptions: number;
  hardBounces: number;
  softBounces: number;
};

export async function fetchBrevoCampaignStatsAction(): Promise<BrevoCampaignStatsRow[]> {
  await requireUser();
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error(
      "BREVO_API_KEY fehlt: in .env.local setzen und Server neu starten (Einstellungen → Brevo).",
    );
  }
  const { BrevoClient, logging } = await import("@getbrevo/brevo");
  const brevo = new BrevoClient({
    apiKey,
    timeoutInSeconds: 30,
    maxRetries: 3,
    logging: { level: logging.LogLevel.Warn, logger: new logging.ConsoleLogger() },
  });
  try {
    const response = await brevo.emailCampaigns.getEmailCampaigns({
      limit: 100,
      statistics: "globalStats",
    });
    return (response.campaigns || []).map((c) => {
      const g = c.statistics?.globalStats;
      const delivered = g?.delivered ?? 0;
      const uniqueClicks = g?.uniqueClicks ?? 0;
      const clickRatePercent =
        delivered > 0 ? Math.round((uniqueClicks / delivered) * 1000) / 10 : null;
      return {
        id: c.id,
        name: c.name,
        status: c.status,
        sent: g?.sent ?? 0,
        delivered,
        uniqueViews: g?.uniqueViews ?? 0,
        uniqueClicks,
        opensRatePercent: g?.opensRate ?? null,
        clickRatePercent,
        complaints: g?.complaints ?? 0,
        unsubscriptions: g?.unsubscriptions ?? 0,
        hardBounces: g?.hardBounces ?? 0,
        softBounces: g?.softBounces ?? 0,
      };
    });
  } catch (err) {
    console.error("Failed to fetch Brevo campaign stats:", err);
    throw mapBrevoClientError(err);
  }
}
