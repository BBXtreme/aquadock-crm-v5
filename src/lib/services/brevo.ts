// src/lib/services/brevo.ts
import { createClient } from "@/lib/supabase/browser";

const BREVO_API_URL = "https://api.brevo.com/v3";

export async function getBrevoApiKey(userId: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("user_settings")
    .select("value")
    .eq("user_id", userId)
    .eq("key", "brevo_api_key")
    .single();
  return data?.value as string | null;
}

export async function createBrevoContact(apiKey: string, contact: { email: string; attributes: Record<string, unknown> }) {
  const response = await fetch(`${BREVO_API_URL}/contacts`, {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(contact),
  });
  if (!response.ok) throw new Error("Failed to create Brevo contact");
  return response.json();
}

export async function createBrevoList(apiKey: string, name: string) {
  const response = await fetch(`${BREVO_API_URL}/contacts/lists`, {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error("Failed to create Brevo list");
  return response.json();
}

export async function sendBrevoCampaign(apiKey: string, campaign: { name: string; subject: string; htmlContent: string; listIds: number[] }) {
  const response = await fetch(`${BREVO_API_URL}/emailCampaigns`, {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(campaign),
  });
  if (!response.ok) throw new Error("Failed to send Brevo campaign");
  return response.json();
}
