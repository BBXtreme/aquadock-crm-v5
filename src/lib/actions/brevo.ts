// src/lib/actions/brevo.ts
"use server";

import { requireUser } from "@/lib/auth/require-user";
import { addContactToList, createBrevoContact, createBrevoList, getBrevoApiKey, sendBrevoCampaign } from "@/lib/services/brevo";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { brevoCampaignSchema, brevoSyncSchema } from "@/lib/validations/brevo";

export async function syncContactsToBrevo(formData: FormData) {
  const user = await requireUser();
  const apiKey = await getBrevoApiKey(user.id);
  if (!apiKey) throw new Error("Brevo API key not configured");

  const data = Object.fromEntries(formData);
  const validated = brevoSyncSchema.parse(data);

  const supabase = await createServerSupabaseClient();
  const { data: contacts } = await supabase
    .from("contacts")
    .select("*, companies(kundentyp, status)")
    .eq("user_id", user.id);

  const filteredContacts = contacts?.filter(contact => {
    if (validated.filterKundentyp && contact.companies?.kundentyp !== validated.filterKundentyp) return false;
    if (validated.filterStatus && contact.companies?.status !== validated.filterStatus) return false;
    return true;
  }) || [];

  for (const contact of filteredContacts) {
    await createBrevoContact(apiKey, {
      email: contact.email,
      attributes: { vorname: contact.vorname, nachname: contact.nachname },
    });
  }
}

export async function createBrevoCampaign(formData: FormData) {
  const user = await requireUser();
  const apiKey = await getBrevoApiKey(user.id);
  if (!apiKey) throw new Error("Brevo API key not configured");

  const data = Object.fromEntries(formData);
  const selectedRecipients = data.selectedRecipients ? JSON.parse(data.selectedRecipients as string) : null;
  const selectedTemplate = data.selectedTemplate as string;

  const validated = brevoCampaignSchema.parse({
    name: data.name as string,
    subject: data.subject as string,
    htmlContent: data.htmlContent as string,
    listIds: data.listIds as string,
    selectedTemplate: data.selectedTemplate as string,
    scheduledAt: data.scheduledAt as string,
  });

  const listIdsArray = validated.listIds.split(',').map(Number).filter(n => !Number.isNaN(n));

  const supabase = await createServerSupabaseClient();

  if (selectedTemplate) {
    const { data: template } = await supabase.from("email_templates").select("*").eq("id", selectedTemplate).single();
    if (template) {
      validated.name = template.name;
      validated.subject = template.subject;
      validated.htmlContent = template.body;
    }
  }

  let finalListIds = listIdsArray;
  if (selectedRecipients && selectedRecipients.length > 0) {
    const listName = `${validated.name} Recipients`;
    const list = await createBrevoList(apiKey, listName);
    const listId = list.id;
    for (const id of selectedRecipients) {
      const { data: contact } = await supabase.from("contacts").select("email").eq("id", id).single();
      if (contact?.email) {
        await addContactToList(apiKey, listId, contact.email);
      }
    }
    finalListIds = [listId];
  }

  const campaign = await sendBrevoCampaign(apiKey, {
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
}
