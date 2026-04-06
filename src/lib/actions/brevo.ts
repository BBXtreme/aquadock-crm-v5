// src/lib/actions/brevo.ts
"use server";

import { requireUser } from "@/lib/auth/require-user";
import {
  addContactToList,
  createBrevoContact,
  createBrevoList,
  mapBrevoClientError,
  sendBrevoCampaign,
} from "@/lib/services/brevo";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  brevoCampaignSchema,
  brevoSelectedRecipientsSchema,
  brevoSyncSchema,
} from "@/lib/validations/brevo";
import type { Contact } from "@/types/database.types";

type BrevoCampaign = {
  id: number;
  name: string;
  subject?: string;
  status: string;
  createdAt: string;
};

// Define type for joined query result (Contact with companies join)
type ContactWithCompany = Contact & {
  companies: { kundentyp: string; status: string } | null;
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

export async function syncContactsToBrevo(formData: FormData) {
  const user = await requireUser();
  const data = Object.fromEntries(formData);
  const validated = brevoSyncSchema.parse(data);

  const supabase = await createServerSupabaseClient();

  const { data: contacts } = await supabase
    .from("contacts")
    .select("*, companies(kundentyp, status)")
    .eq("user_id", user.id);

  // Type contacts explicitly to avoid implicit any on contact parameter
  const typedContacts: ContactWithCompany[] = contacts ?? [];

  const filteredContacts = typedContacts.filter((contact) => {
    if (validated.filterKundentyp && contact.companies?.kundentyp !== validated.filterKundentyp) return false;
    if (validated.filterStatus && contact.companies?.status !== validated.filterStatus) return false;
    return true;
  });

  try {
    for (const contact of filteredContacts) {
      if (contact.email) {
        await createBrevoContact({
          email: contact.email,
          attributes: { vorname: contact.vorname, nachname: contact.nachname },
        });
      }
    }
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
    listIds: (data.listIds as string || "").split(",").map(Number).filter(n => !Number.isNaN(n)),
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

  let finalListIds = validated.listIds;

  const hasRecipients = selectedRecipients !== null && selectedRecipients.length > 0;
  const hasListIds = finalListIds.length > 0;
  if (!hasRecipients && !hasListIds) {
    throw new Error(
      "Bitte mindestens eine Brevo-Liste angeben oder Empfänger in der Tabelle auswählen.",
    );
  }

  try {
    if (hasRecipients) {
      const listName = `${validated.name} Recipients`;
      const list = await createBrevoList(listName);
      const listId = list.id;

      for (const id of selectedRecipients) {
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
    }

    const campaign = await sendBrevoCampaign({
      name: validated.name,
      subject: validated.subject,
      htmlContent: validated.htmlContent,
      listIds: finalListIds,
      scheduledAt: validated.scheduledAt,
    });

    await supabase.from("email_log").insert({
      recipient_email: "campaign@brevo.com",
      subject: validated.subject,
      template_name: "Brevo Campaign",
      status: "sent",
      user_id: user.id,
    });

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
export async function fetchBrevoCampaignsAction(): Promise<BrevoCampaign[]> {
  await requireUser();
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error(
      "BREVO_API_KEY fehlt: in .env.local setzen und Server neu starten (Einstellungen → Brevo).",
    );
  }
  const { BrevoClient, logging } = await import('@getbrevo/brevo');
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
      subject: c.subject || '',
      status: c.status,
      createdAt: c.createdAt,
    }));
  } catch (err) {
    console.error("Failed to fetch Brevo campaigns:", err);
    throw mapBrevoClientError(err);
  }
}
