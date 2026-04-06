// src/lib/services/brevo.ts
import { BrevoClient } from "@getbrevo/brevo";

export function createBrevoContact(contactData: { email: string; attributes?: Record<string, any> }) {
  if (!process.env.BREVO_API_KEY) {
    throw new Error("Brevo API key not configured in .env.local");
  }
  const apiKey = process.env.BREVO_API_KEY;
  const brevo = new BrevoClient({ apiKey });
  const contactsApi = brevo.contacts;

  try {
    const response = contactsApi.createContact({
      email: contactData.email,
      attributes: contactData.attributes || {},
    });
    return response;
  } catch (error: any) {
    throw new Error(`Failed to create Brevo contact: ${error.message}`);
  }
}

export function sendBrevoCampaign(campaignData: { name: string; subject: string; htmlContent: string; listIds: number[]; scheduledAt?: string }) {
  if (!process.env.BREVO_API_KEY) {
    throw new Error("Brevo API key not configured in .env.local");
  }
  const apiKey = process.env.BREVO_API_KEY;
  const brevo = new BrevoClient({ apiKey });
  const emailCampaignsApi = brevo.emailCampaigns;

  try {
    const response = emailCampaignsApi.createEmailCampaign({
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

export function createBrevoList(name: string) {
  if (!process.env.BREVO_API_KEY) {
    throw new Error("Brevo API key not configured in .env.local");
  }
  const apiKey = process.env.BREVO_API_KEY;
  const brevo = new BrevoClient({ apiKey });
  const listsApi = brevo.lists;

  try {
    const response = listsApi.createList({
      name,
    });
    return response;
  } catch (error: any) {
    throw new Error(`Failed to create Brevo list: ${error.message}`);
  }
}

export function addContactToList(listId: number, email: string) {
  if (!process.env.BREVO_API_KEY) {
    throw new Error("Brevo API key not configured in .env.local");
  }
  const apiKey = process.env.BREVO_API_KEY;
  const brevo = new BrevoClient({ apiKey });
  const listsApi = brevo.lists;

  try {
    const response = listsApi.addContactToList(listId, { emails: [email] });
    return response;
  } catch (error: any) {
    throw new Error(`Failed to add contact to list: ${error.message}`);
  }
}
