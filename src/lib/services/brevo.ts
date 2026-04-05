// src/lib/services/brevo.ts
import { BrevoClient } from "@getbrevo/brevo";
import { createClient } from "@/lib/supabase/browser";

export async function getBrevoApiKey(userId: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("user_settings")
    .select("value")
    .eq("user_id", userId)
    .eq("key", "brevo_api_key")
    .single();

  if (error) {
    throw new Error(`Failed to fetch Brevo API key: ${error.message}`);
  }

  return data?.value as string | null;
}

export async function createBrevoContact(apiKey: string, contactData: { email: string; attributes?: Record<string, any> }) {
  const brevo = new BrevoClient({ apiKey });
  const contactsApi = brevo.contacts;

  try {
    const response = await contactsApi.createContact({
      email: contactData.email,
      attributes: contactData.attributes || {},
    });
    return response;
  } catch (error: any) {
    throw new Error(`Failed to create Brevo contact: ${error.message}`);
  }
}

export async function sendBrevoCampaign(apiKey: string, campaignData: { name: string; subject: string; htmlContent: string; listIds: number[]; scheduledAt?: string }) {
  const brevo = new BrevoClient({ apiKey });
  const emailCampaignsApi = brevo.emailCampaigns;

  try {
    const response = await emailCampaignsApi.createEmailCampaign({
      name: campaignData.name,
      subject: campaignData.subject,
      htmlContent: campaignData.htmlContent,
      sender: { name: "AquaDock CRM", email: "noreply@aquadock.com" },
      recipients: {
        listIds: campaignData.listIds,
      },
      scheduledAt: campaignData.scheduledAt,
    });
    return response;
  } catch (error: any) {
    throw new Error(`Failed to send Brevo campaign: ${error.message}`);
  }
}
