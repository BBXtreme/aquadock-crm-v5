// src/lib/services/brevo.ts
import { BrevoClient } from "@getbrevo/brevo";

const getApiKey = (): string => {
  if (!process.env.BREVO_API_KEY) {
    throw new Error("Brevo API key not configured in .env.local");
  }
  return process.env.BREVO_API_KEY;
};

export async function createBrevoContact(contactData: { email: string; attributes?: Record<string, any> }) {
  const apiKey = getApiKey();
  const brevo = new BrevoClient({ apiKey });
  const response = await brevo.contacts.createContact({
    email: contactData.email,
    attributes: contactData.attributes || {},
  });
  return response;
}

export async function sendBrevoCampaign(campaignData: {
  name: string;
  subject: string;
  htmlContent: string;
  listIds: number[];
  scheduledAt?: string;
}) {
  const apiKey = getApiKey();
  const brevo = new BrevoClient({ apiKey });
  const response = await brevo.emailCampaigns.createEmailCampaign({
    name: campaignData.name,
    subject: campaignData.subject,
    htmlContent: campaignData.htmlContent,
    sender: { name: "AquaDock CRM", email: "noreply@aquadock.com" },
    recipients: { listIds: campaignData.listIds },
    scheduledAt: campaignData.scheduledAt,
  });
  return response;
}

export async function createBrevoList(name: string) {
  const apiKey = getApiKey();
  const brevo = new BrevoClient({ apiKey });
  const response = await brevo.contacts.createList({
    name,
    folderId: 1, // Change to your actual Brevo folder ID if you have multiple folders
  });
  return response;
}

export async function addContactToList(listId: number, email: string) {
  const apiKey = getApiKey();
  const brevo = new BrevoClient({ apiKey });
  // SDK call with request object
  const response = await brevo.contacts.addContactToList({
    listId,
    emails: [email],
  });
  return response;
}
