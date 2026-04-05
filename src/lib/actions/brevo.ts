// src/lib/actions/brevo.ts
"use server";

import { requireUser } from "@/lib/auth/require-user";
import { createBrevoContact, getBrevoApiKey, sendBrevoCampaign } from "@/lib/services/brevo";
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
    .select("*")
    .eq("user_id", user.id)
    .eq(validated.filterKundentyp ? "kundentyp" : "", validated.filterKundentyp || "")
    .eq(validated.filterStatus ? "status" : "", validated.filterStatus || "");

  for (const contact of contacts || []) {
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
  const validated = brevoCampaignSchema.parse(data);

  const campaign = await sendBrevoCampaign(apiKey, validated);

  const supabase = await createServerSupabaseClient();
  await supabase.from("email_log").insert({
    recipient_email: "campaign@brevo.com",
    subject: validated.subject,
    template_name: "Brevo Campaign",
    status: "sent",
    user_id: user.id,
  });

  return campaign;
}
