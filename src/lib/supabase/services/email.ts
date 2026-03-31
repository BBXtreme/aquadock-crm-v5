// src/lib/supabase/services/email.ts
// This file contains functions for managing email logs and templates in the Supabase database.
// It includes functions to get all email logs/templates, get by ID, create new entries, update existing entries, and delete entries.
// The functions use the Supabase client to interact with the database and handle errors using a utility function.
// The code is designed to be reusable across different parts of the app that need to access or modify email logs and templates.

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  EmailLog,
  EmailLogInsert,
  EmailLogUpdate,
  EmailTemplate,
  EmailTemplateInsert,
  EmailTemplateUpdate,
} from "../database.types";
import { handleSupabaseError } from "../db-error-utils";

/**
 * Get all email logs
 */
export async function getEmailLogs(client: SupabaseClient): Promise<EmailLog[]> {
  const { data, error } = await client.from("email_log").select("*");
  if (error) throw handleSupabaseError(error, "getEmailLogs");
  return (data ?? []) as EmailLog[];
}

/**
 * Get email log by ID
 */
export async function getEmailLogById(id: string, client: SupabaseClient): Promise<EmailLog | null> {
  const { data, error } = await client.from("email_log").select("*").eq("id", id).single();
  if (error) throw handleSupabaseError(error, "getEmailLogById");
  return (data as EmailLog | null) ?? null;
}

/**
 * Create a new email log
 */
export async function createEmailLog(emailLog: EmailLogInsert, client: SupabaseClient): Promise<EmailLog> {
  const { data, error } = await client.from("email_log").insert(emailLog).select().single();
  if (error) throw handleSupabaseError(error, "createEmailLog");
  return data as EmailLog;
}

/**
 * Update an email log
 */
export async function updateEmailLog(id: string, updates: EmailLogUpdate, client: SupabaseClient): Promise<EmailLog> {
  const { data, error } = await client.from("email_log").update(updates).eq("id", id).select().single();
  if (error) throw handleSupabaseError(error, "updateEmailLog");
  return data as EmailLog;
}

/**
 * Delete an email log
 */
export async function deleteEmailLog(id: string, client: SupabaseClient): Promise<void> {
  const { error } = await client.from("email_log").delete().eq("id", id);
  if (error) throw handleSupabaseError(error, "deleteEmailLog");
}

/**
 * Get all email templates
 */
export async function getEmailTemplates(client: SupabaseClient): Promise<EmailTemplate[]> {
  const { data, error } = await client.from("email_templates").select("*");
  if (error) throw handleSupabaseError(error, "getEmailTemplates");
  return (data ?? []) as EmailTemplate[];
}

/**
 * Get email template by ID
 */
export async function getEmailTemplateById(id: string, client: SupabaseClient): Promise<EmailTemplate | null> {
  const { data, error } = await client.from("email_templates").select("*").eq("id", id).single();
  if (error) throw handleSupabaseError(error, "getEmailTemplateById");
  return (data as EmailTemplate | null) ?? null;
}

/**
 * Create a new email template
 */
export async function createEmailTemplate(
  template: EmailTemplateInsert,
  client: SupabaseClient,
): Promise<EmailTemplate> {
  const { data, error } = await client.from("email_templates").insert(template).select().single();
  if (error) throw handleSupabaseError(error, "createEmailTemplate");
  return data as EmailTemplate;
}

/**
 * Update an email template
 */
export async function updateEmailTemplate(
  id: string,
  updates: EmailTemplateUpdate,
  client: SupabaseClient,
): Promise<EmailTemplate> {
  const { data, error } = await client.from("email_templates").update(updates).eq("id", id).select().single();
  if (error) throw handleSupabaseError(error, "updateEmailTemplate");
  return data as EmailTemplate;
}

/**
 * Delete an email template
 */
export async function deleteEmailTemplate(id: string, client: SupabaseClient): Promise<void> {
  const { error } = await client.from("email_templates").delete().eq("id", id);
  if (error) throw handleSupabaseError(error, "deleteEmailTemplate");
}

// === MASS EMAIL HELPERS (added for v5 Mass Email page) ===

/**
 * Get recipients for mass email with flexible filtering
 * Supports companies or contacts mode + basic filters (expandable)
 */
export async function getMassEmailRecipients(
  client: SupabaseClient,
  options: {
    mode: 'companies' | 'contacts';
    status?: string;
    kundentyp?: string;
    land?: string;
    search?: string;
    limit?: number;
  } = { mode: 'contacts' }
): Promise<Array<{
  id: string;
  name: string;
  email: string;
  firmenname?: string;
  company_id?: string;
}>> {
  const { mode, status, kundentyp, land, search, limit = 500 } = options;

  if (mode === 'contacts') {
    let query = client
      .from('contacts')
      .select(`
        id,
        vorname,
        nachname,
        anrede,
        email,
        companies!inner(id, firmenname)
      `)
      .not('email', 'is', null)
      .neq('email', '');

    if (status) query = query.eq('companies.status', status);
    if (kundentyp) query = query.eq('companies.kundentyp', kundentyp);
    if (land) query = query.eq('companies.land', land);
    if (search) {
      const term = `%${search}%`;
      query = query.or(`vorname.ilike.${term},nachname.ilike.${term},email.ilike.${term},companies.firmenname.ilike.${term}`);
    }

    const { data, error } = await query.limit(limit).order('nachname');

    if (error) throw handleSupabaseError(error, 'getMassEmailRecipients:contacts');

    type RawContact = {
      id: string;
      vorname: string | null;
      nachname: string | null;
      anrede: string | null;
      email: string;
      companies: { id: string; firmenname: string };
    };

    return (data as unknown as RawContact[]).map((c: RawContact) => ({
      id: c.id,
      name: [c.anrede, c.vorname, c.nachname].filter(Boolean).join(' ').trim() || 'Unbekannt',
      email: c.email,
      firmenname: c.companies.firmenname,
      company_id: c.companies.id,
    }));
  }
    // companies mode – use company email or primary contact fallback (simplified for now)
    let query = client
      .from('companies')
      .select('id, firmenname, email')
      .not('email', 'is', null)
      .neq('email', '');

    if (status) query = query.eq('status', status);
    if (kundentyp) query = query.eq('kundentyp', kundentyp);
    if (land) query = query.eq('land', land);
    if (search) query = query.ilike('firmenname', `%${search}%`);

    const { data, error } = await query.limit(limit).order('firmenname');

    if (error) throw handleSupabaseError(error, 'getMassEmailRecipients:companies');
    return (data ?? []).map((c: {
      id: string;
      firmenname: string;
      email: string;
    }) => ({
      id: c.id,
      name: c.firmenname,
      email: c.email,
      firmenname: c.firmenname,
    }));
}

/**
 * Fill placeholders in subject/body (ported & improved from v4)
 */
export function fillPlaceholders(
  text: string,
  recipient: { name: string; firmenname?: string; anrede?: string; vorname?: string; nachname?: string; stadt?: string }
): string {
  return text
    .replace(/{{anrede}}/gi, recipient.anrede || '')
    .replace(/{{vorname}}/gi, recipient.vorname || '')
    .replace(/{{nachname}}/gi, recipient.nachname || '')
    .replace(/{{firmenname}}/gi, recipient.firmenname || '')
    .replace(/{{stadt}}/gi, recipient.stadt || '')
    .replace(/{{name}}/gi, recipient.name);
}

import nodemailer from 'nodemailer';
import { createClient } from '../browser-client'; // or server when needed

// Get SMTP config from user_settings
export async function getSmtpConfig(userId: string) {
  const client = createClient();
  const { data, error } = await client
    .from('user_settings')
    .select('value')
    .eq('user_id', userId)
    .eq('key', 'smtp_config')
    .maybeSingle();

  if (error) throw handleSupabaseError(error, 'getSmtpConfig');
  if (!data?.value) return null;

  return JSON.parse(data.value) as {
    host: string;
    port: number;
    user: string;
    password: string;
    name?: string;
    secure?: boolean;
  };
}

// Main mass send function (server-safe)
export async function sendMassEmail({
  userId,
  templateId,
  recipientIds,
  mode,
  subjectOverride,
  bodyOverride,
  delayMs = 1000,
}: {
  userId: string;
  templateId?: string;
  recipientIds: string[];
  mode: 'contacts' | 'companies';
  subjectOverride?: string;
  bodyOverride?: string;
  delayMs?: number;
}) {
  const client = createClient();
  const smtp = await getSmtpConfig(userId);

  if (!smtp?.host || !smtp?.user || !smtp?.password) {
    throw new Error('SMTP nicht konfiguriert. Bitte Einstellungen prüfen.');
  }

  // Fetch recipients again (secure)
  const recipients = await getMassEmailRecipients(client, { mode });
  const selected = recipients.filter((r) => recipientIds.includes(r.id));

  if (selected.length === 0) throw new Error('Keine Empfänger ausgewählt');

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port || 587,
    secure: smtp.secure || false,
    auth: { user: smtp.user, pass: smtp.password },
  });

  let sent = 0;
  let errors = 0;
  const results: Array<{ email: string; status: 'sent' | 'error'; error?: string }> = [];

  for (const rec of selected) {
    try {
      const subject = subjectOverride || (templateId ? 'Template Subject' : ''); // improve later
      const body = bodyOverride || '';

      await transporter.sendMail({
        from: `"${smtp.name || 'AquaDock CRM'}" <${smtp.user}>`,
        to: rec.email,
        subject: fillPlaceholders(subject, rec),
        html: fillPlaceholders(body, rec),
      });

      // Log success
      await createEmailLog({
        recipient_email: rec.email,
        subject,
        body: fillPlaceholders(body, rec),
        status: 'sent',
      }, client);

      sent++;
      results.push({ email: rec.email, status: 'sent' });
    } catch (err: unknown) {
      const error = err as Error;
      errors++;
      await createEmailLog({
        recipient_email: rec.email,
        subject: subjectOverride || '',
        body: bodyOverride || '',
        status: 'error',
      }, client);
      results.push({ email: rec.email, status: 'error', error: error.message });
    }

    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  }

  return { sent, errors, total: selected.length, results };
}
