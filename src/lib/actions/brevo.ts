// src/lib/actions/brevo.ts
"use server";

import { requireUser } from "@/lib/auth/require-user";
import { addContactToList, createBrevoContact, createBrevoList, sendBrevoCampaign } from "@/lib/services/brevo";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { brevoCampaignSchema, brevoSyncSchema } from "@/lib/validations/brevo";
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

export async function syncContactsToBrevo(formData: FormData) {
  const user = await requireUser();
  const data = Object.fromEntries(formData);
  const validated = brevoSyncSchema.parse(data);

  const supabase = createServerSupabaseClient();

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
    console.error('Brevo sync error:', err);
    throw new Error(`Failed to sync contacts to Brevo: ${(err as Error).message}`);
  }
}

export async function createBrevoCampaign(formData: FormData) {
  const user = await requireUser();
  const data = Object.fromEntries(formData);

  const selectedRecipients = data.selectedRecipients ? JSON.parse(data.selectedRecipients as string) : null;
  const selectedTemplate = data.selectedTemplate as string;

  const validated = brevoCampaignSchema.parse({
    name: data.name,
    subject: data.subject,
    htmlContent: data.htmlContent,
    listIds: (data.listIds as string || "").split(",").map(Number).filter(n => !Number.isNaN(n)),
    selectedTemplate,
    scheduledAt: data.scheduledAt,
  });

  const supabase = createServerSupabaseClient();

  // Template override (if selected)
  if (selectedTemplate) {
    const { data: template } = await supabase
      .from("email_templates")
      .select("*")
      .eq("id", selectedTemplate)
      .single();

    if (template) {
      validated.name = template.name;
      validated.subject = template.subject;
      validated.htmlContent = template.body;
    }
  }

  let finalListIds = validated.listIds;

  try {
    if (selectedRecipients && selectedRecipients.length > 0) {
      const listName = `${validated.name} Recipients`;
      const list = await createBrevoList(listName);
      const listId = list.id;

      for (const id of selectedRecipients) {
        const { data: contact } = await supabase
          .from("contacts")
          .select("email")
          .eq("id", id)
          .single();
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
    console.error('Brevo campaign creation error:', err);
    throw new Error(`Failed to create Brevo campaign: ${(err as Error).message}`);
  }
}

export async function fetchBrevoCampaignsAction(): Promise<BrevoCampaign[]> {
  const _user = await requireUser();
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY not configured');
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
    console.error('Failed to fetch Brevo campaigns:', err);
    throw err;
  }
}
