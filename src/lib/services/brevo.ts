// src/lib/services/brevo.ts

import { BrevoClient, BrevoError, logging } from "@getbrevo/brevo";

import { createServerSupabaseClient } from "@/lib/supabase/server";

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

function isContactAlreadyExistsError(err: unknown): boolean {
  if (!(err instanceof BrevoError)) return false;
  const code = err.statusCode;
  if (code !== 400 && code !== 409) return false;
  const body = err.body;
  if (body && typeof body === "object" && "code" in body) {
    const c = String((body as { code?: string }).code ?? "").toLowerCase();
    if (c.includes("duplicate")) return true;
  }
  const blob = `${err.message} ${typeof body === "object" ? JSON.stringify(body) : ""}`.toLowerCase();
  return (
    blob.includes("already exist") ||
    blob.includes("already associated") ||
    blob.includes("duplicate") ||
    blob.includes("contact already")
  );
}

export type CreateBrevoContactOutcome = "created" | "already_exists";

/**
 * Creates a Brevo contact; treats “already exists” style API responses as success path (no throw).
 */
export async function createBrevoContactUnlessExists(contactData: {
  email: string;
  attributes?: Record<string, unknown>;
}): Promise<CreateBrevoContactOutcome> {
  const apiKey = getApiKey();
  const brevo = new BrevoClient({
    apiKey,
    timeoutInSeconds: 30,
    maxRetries: 3,
    logging: { level: logging.LogLevel.Warn, logger: new logging.ConsoleLogger() },
  });
  try {
    const attributes = toBrevoAttributes(contactData.attributes);
    await brevo.contacts.createContact({
      email: contactData.email,
      ...(attributes ? { attributes } : {}),
    });
    return "created";
  } catch (err) {
    if (isContactAlreadyExistsError(err)) {
      return "already_exists";
    }
    throw mapBrevoClientError(err);
  }
}

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

const DEFAULT_BREVO_SENDER_NAME = "Hey from AquaDock CRM";
const DEFAULT_BREVO_SENDER_EMAIL = "noreply@aquadock.com";

function settingValueAsTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Campaign sender: `user_settings` keys `brevo_sender_name` / `brevo_sender_email` (string values), else env, else defaults.
 */
export async function getBrevoSender(): Promise<{ name: string; email: string }> {
  const envName = process.env.BREVO_SENDER_NAME?.trim() ?? "";
  const envEmail = process.env.BREVO_SENDER_EMAIL?.trim() ?? "";

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        name: envName || DEFAULT_BREVO_SENDER_NAME,
        email: envEmail || DEFAULT_BREVO_SENDER_EMAIL,
      };
    }

    const { data: rows } = await supabase
      .from("user_settings")
      .select("key, value")
      .eq("user_id", user.id)
      .in("key", ["brevo_sender_name", "brevo_sender_email"]);

    let dbName = "";
    let dbEmail = "";
    for (const row of rows ?? []) {
      if (row.key === "brevo_sender_name") dbName = settingValueAsTrimmedString(row.value);
      if (row.key === "brevo_sender_email") dbEmail = settingValueAsTrimmedString(row.value);
    }

    return {
      name: dbName || envName || DEFAULT_BREVO_SENDER_NAME,
      email: dbEmail || envEmail || DEFAULT_BREVO_SENDER_EMAIL,
    };
  } catch {
    return {
      name: envName || DEFAULT_BREVO_SENDER_NAME,
      email: envEmail || DEFAULT_BREVO_SENDER_EMAIL,
    };
  }
}

/** Active SMTP/transactional templates from Brevo (`getSmtpTemplates`). IDs are valid for `createEmailCampaign.templateId`. */
export type BrevoFetchedTemplate = {
  id: number;
  name: string;
  subject: string;
  htmlContent: string;
};

/**
 * Lists active transactional (SMTP) email templates. These are the template IDs Brevo accepts for marketing
 * `createEmailCampaign` (`templateId` copies template content into the campaign).
 */
export async function fetchBrevoTemplates(): Promise<BrevoFetchedTemplate[]> {
  const apiKey = getApiKey();
  const brevo = new BrevoClient({
    apiKey,
    timeoutInSeconds: 30,
    maxRetries: 3,
    logging: { level: logging.LogLevel.Warn, logger: new logging.ConsoleLogger() },
  });
  try {
    const pageSize = 50;
    const out: BrevoFetchedTemplate[] = [];
    let offset = 0;
    for (;;) {
      const res = await brevo.transactionalEmails.getSmtpTemplates({
        templateStatus: true,
        limit: pageSize,
        offset,
      });
      const templates = res.templates ?? [];
      for (const t of templates) {
        if (!t.isActive) continue;
        out.push({
          id: t.id,
          name: t.name,
          subject: t.subject,
          htmlContent: t.htmlContent,
        });
      }
      if (templates.length < pageSize) break;
      offset += pageSize;
    }
    return out;
  } catch (err) {
    throw mapBrevoClientError(err);
  }
}

export async function sendBrevoCampaign(campaignData: {
  name: string;
  subject: string;
  htmlContent?: string;
  listIds: number[];
  scheduledAt?: string;
  /** Brevo transactional template id; when set, `htmlContent` is omitted (API uses template body). */
  templateId?: number;
}) {
  const apiKey = getApiKey();
  const sender = await getBrevoSender();
  const brevo = new BrevoClient({
    apiKey,
    timeoutInSeconds: 30,
    maxRetries: 3,
    logging: { level: logging.LogLevel.Warn, logger: new logging.ConsoleLogger() },
  });
  const listIds = campaignData.listIds.filter((id) => Number.isInteger(id) && id > 0);
  if (listIds.length === 0) {
    throw new Error(
      "Brevo-Kampagne: mindestens eine gültige Empfängerliste ist erforderlich (Listen-ID fehlt oder ungültig).",
    );
  }

  try {
    const useTemplate = campaignData.templateId != null && Number.isInteger(campaignData.templateId);
    const response = await brevo.emailCampaigns.createEmailCampaign({
      name: campaignData.name,
      subject: campaignData.subject,
      ...(useTemplate
        ? { templateId: campaignData.templateId }
        : { htmlContent: campaignData.htmlContent ?? "" }),
      sender: { name: sender.name, email: sender.email },
      recipients: { listIds },
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

export type BrevoListSummary = {
  id: number;
  name: string;
  folderId: number;
};

/**
 * Fetches all contact lists (paginated under the hood).
 */
export async function fetchBrevoLists(): Promise<BrevoListSummary[]> {
  const apiKey = getApiKey();
  const brevo = new BrevoClient({
    apiKey,
    timeoutInSeconds: 30,
    maxRetries: 3,
    logging: { level: logging.LogLevel.Warn, logger: new logging.ConsoleLogger() },
  });
  try {
    const pageSize = 50;
    const out: BrevoListSummary[] = [];
    let offset = 0;
    for (;;) {
      const res = await brevo.contacts.getLists({ limit: pageSize, offset, sort: "desc" });
      const lists = res.lists ?? [];
      for (const l of lists) {
        out.push({ id: l.id, name: l.name, folderId: l.folderId });
      }
      if (lists.length < pageSize) break;
      offset += pageSize;
    }
    return out;
  } catch (err) {
    throw mapBrevoClientError(err);
  }
}

/**
 * Single Brevo `contacts/import` call (async job on Brevo side; returns `processId`).
 * Requires either `listIds` or `newList` per API rules.
 */
export async function importBrevoContactsBulk(params: {
  jsonBody: { email: string; attributes?: Record<string, unknown> }[];
  listIds?: number[];
  newList?: { listName: string; folderId?: number };
  updateExistingContacts?: boolean;
}): Promise<{ processId: number }> {
  const apiKey = getApiKey();
  const brevo = new BrevoClient({
    apiKey,
    timeoutInSeconds: 60,
    maxRetries: 2,
    logging: { level: logging.LogLevel.Warn, logger: new logging.ConsoleLogger() },
  });
  const hasLists = (params.listIds?.length ?? 0) > 0;
  const hasNewList = Boolean(params.newList?.listName?.trim());
  if (!hasLists && !hasNewList) {
    throw new Error("Brevo-Import: listIds oder newList.listName ist erforderlich.");
  }
  try {
    const jsonBody = params.jsonBody.map((row) => {
      const attributes = toBrevoAttributes(row.attributes);
      return {
        email: row.email,
        ...(attributes ? { attributes: attributes as Record<string, unknown> } : {}),
      };
    });
    const response = await brevo.contacts.importContacts({
      jsonBody,
      ...(hasLists ? { listIds: params.listIds } : {}),
      ...(hasNewList && params.newList
        ? {
            newList: {
              listName: params.newList.listName.trim(),
              folderId: params.newList.folderId ?? 1,
            },
          }
        : {}),
      updateExistingContacts: params.updateExistingContacts ?? true,
      disableNotification: true,
    });
    return { processId: response.processId };
  } catch (err) {
    throw mapBrevoClientError(err);
  }
}
