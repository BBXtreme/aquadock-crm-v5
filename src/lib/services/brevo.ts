// src/lib/services/brevo.ts

import { BrevoClient, BrevoError, logging } from "@getbrevo/brevo";

/** User-facing hint when Brevo returns 401 (e.g. "Key not found"). */
const BREVO_401_REST_KEY_HINT =
  "Brevo 401: Schlüssel ungültig oder falscher Typ. Für Kampagnen/Kontakte/Listen brauchst du einen v3-API-Key unter Brevo → SMTP & API → API keys (Präfix xkeysib-). SMTP-Relay-Schlüssel (xsmtpsib-) gelten nicht für api.brevo.com/v3.";

export function mapBrevoClientError(err: unknown): Error {
  if (err instanceof BrevoError) {
    if (err.statusCode === 401) {
      return new Error(BREVO_401_REST_KEY_HINT);
    }
    if (err.statusCode === 429) {
      const retry = err.rawResponse?.headers?.get("retry-after");
      return new Error(
        retry ? `Brevo: Rate limit; bitte in ${retry}s erneut versuchen.` : "Brevo: Rate limit; bitte später erneut versuchen.",
      );
    }
    return new Error(`Brevo API (${err.statusCode}): ${err.message}`);
  }
  return err instanceof Error ? err : new Error(String(err));
}

/** Matches Brevo `CreateContactRequest.Attributes.Value` (SDK v5). */
type BrevoAttributeValue = number | string | boolean | string[];

function toBrevoAttributes(
  input: Record<string, unknown> | undefined,
): Record<string, BrevoAttributeValue> | undefined {
  if (!input || Object.keys(input).length === 0) return undefined;
  const out: Record<string, BrevoAttributeValue> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
    } else if (Array.isArray(value) && value.every((item): item is string => typeof item === "string")) {
      out[key] = value;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export const getApiKey = (): string => {
  const key = process.env.BREVO_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "Brevo API-Schlüssel fehlt: Umgebungsvariable BREVO_API_KEY in .env.local setzen und den Dev-Server neu starten (Hinweis unter Einstellungen → Brevo).",
    );
  }
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
    const attributes = toBrevoAttributes(contactData.attributes);
    const response = await brevo.contacts.createContact({
      email: contactData.email,
      ...(attributes ? { attributes } : {}),
    });
    return response;
  } catch (err) {
    throw mapBrevoClientError(err);
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
    throw mapBrevoClientError(err);
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
    throw mapBrevoClientError(err);
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
      body: { emails: [email] },
    });
    return response;
  } catch (err) {
    throw mapBrevoClientError(err);
  }
}
