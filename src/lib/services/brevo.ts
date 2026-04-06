// src/lib/services/brevo.ts

import { BrevoClient, BrevoError, logging } from '@getbrevo/brevo';

export const getApiKey = (): string => {
  const key = process.env.BREVO_API_KEY;
  if (!key) throw new Error('Brevo API key not configured in environment variables');
  return key;
};

export async function createBrevoContact(contactData: { email: string; attributes?: Record<string, unknown> }) {
  const apiKey = getApiKey();
  const brevo = new BrevoClient({
    apiKey,
    timeoutInSeconds: 30,
    maxRetries: 3,
    logging: { level: logging.LogLevel.Warn, logger: new logging.ConsoleLogger() },
  });
  try {
    const response = await brevo.contacts.createContact({
      email: contactData.email,
      attributes: contactData.attributes || {},
    });
    return response;
  } catch (err) {
    if (err instanceof BrevoError) {
      if (err.statusCode === 401) throw new Error('Invalid Brevo API key');
      if (err.statusCode === 429) throw new Error(`Rate limited; retry after ${err.rawResponse?.headers?.get('retry-after') || 'unknown'}s`);
      throw new Error(`Brevo API error ${err.statusCode}: ${err.message}`);
    }
    throw err;
  }
}

export async function sendBrevoCampaign(campaignData: {
  name: string;
  subject: string;
  htmlContent: string;
  listIds: number[];
  scheduledAt?: string;
}) {
  const apiKey = getApiKey();
  const brevo = new BrevoClient({
    apiKey,
    timeoutInSeconds: 30,
    maxRetries: 3,
    logging: { level: logging.LogLevel.Warn, logger: new logging.ConsoleLogger() },
  });
  try {
    const response = await brevo.emailCampaigns.createEmailCampaign({
      name: campaignData.name,
      subject: campaignData.subject,
      htmlContent: campaignData.htmlContent,
      sender: { name: 'Hey from AquaDock CRM', email: 'noreply@aquadock.com' },
      recipients: { listIds: campaignData.listIds },
      scheduledAt: campaignData.scheduledAt,
    });
    return response;
  } catch (err) {
    if (err instanceof BrevoError) {
      if (err.statusCode === 401) throw new Error('Invalid Brevo API key');
      if (err.statusCode === 429) throw new Error(`Rate limited; retry after ${err.rawResponse?.headers?.get('retry-after') || 'unknown'}s`);
      throw new Error(`Brevo API error ${err.statusCode}: ${err.message}`);
    }
    throw err;
  }
}

export async function createBrevoList(name: string) {
  const apiKey = getApiKey();
  const brevo = new BrevoClient({
    apiKey,
    timeoutInSeconds: 30,
    maxRetries: 3,
    logging: { level: logging.LogLevel.Warn, logger: new logging.ConsoleLogger() },
  });
  try {
    const response = await brevo.contacts.createList({
      name,
      folderId: 1,
    });
    return response;
  } catch (err) {
    if (err instanceof BrevoError) {
      if (err.statusCode === 401) throw new Error('Invalid Brevo API key');
      if (err.statusCode === 429) throw new Error(`Rate limited; retry after ${err.rawResponse?.headers?.get('retry-after') || 'unknown'}s`);
      throw new Error(`Brevo API error ${err.statusCode}: ${err.message}`);
    }
    throw err;
  }
}

export async function addContactToList(listId: number, email: string) {
  const apiKey = getApiKey();
  const brevo = new BrevoClient({
    apiKey,
    timeoutInSeconds: 30,
    maxRetries: 3,
    logging: { level: logging.LogLevel.Warn, logger: new logging.ConsoleLogger() },
  });
  try {
    const response = await brevo.contacts.addContactToList({
      listId,
      emails: [email],
    });
    return response;
  } catch (err) {
    if (err instanceof BrevoError) {
      if (err.statusCode === 401) throw new Error('Invalid Brevo API key');
      if (err.statusCode === 429) throw new Error(`Rate limited; retry after ${err.rawResponse?.headers?.get('retry-after') || 'unknown'}s`);
      throw new Error(`Brevo API error ${err.statusCode}: ${err.message}`);
    }
    throw err;
  }
}
