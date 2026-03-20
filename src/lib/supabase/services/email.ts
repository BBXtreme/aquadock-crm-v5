import { handleSupabaseError } from "../utils";
import type {
  EmailLog,
  EmailLogInsert,
  EmailLogUpdate,
  EmailTemplate,
  EmailTemplateInsert,
  EmailTemplateUpdate,
} from "../database.types";

/**
 * Get all email logs
 */
export async function getEmailLogs(client: any): Promise<EmailLog[]> {
  const { data, error } = await client.from("email_log").select("*");
  if (error) throw handleSupabaseError(error, "getEmailLogs");
  return (data ?? []) as EmailLog[];
}

/**
 * Get email log by ID
 */
export async function getEmailLogById(
  id: string,
  client: any,
): Promise<EmailLog | null> {
  const { data, error } = await client
    .from("email_log")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw handleSupabaseError(error, "getEmailLogById");
  return (data as EmailLog | null) ?? null;
}

/**
 * Create a new email log
 */
export async function createEmailLog(
  emailLog: EmailLogInsert,
  client: any,
): Promise<EmailLog> {
  const { data, error } = await client
    .from("email_log")
    .insert(emailLog)
    .select()
    .single();
  if (error) throw handleSupabaseError(error, "createEmailLog");
  return data as EmailLog;
}

/**
 * Update an email log
 */
export async function updateEmailLog(
  id: string,
  updates: EmailLogUpdate,
  client: any,
): Promise<EmailLog> {
  const { data, error } = await client
    .from("email_log")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw handleSupabaseError(error, "updateEmailLog");
  return data as EmailLog;
}

/**
 * Delete an email log
 */
export async function deleteEmailLog(id: string, client: any): Promise<void> {
  const { error } = await client.from("email_log").delete().eq("id", id);
  if (error) throw handleSupabaseError(error, "deleteEmailLog");
}

/**
 * Get all email templates
 */
export async function getEmailTemplates(client: any): Promise<EmailTemplate[]> {
  const { data, error } = await client.from("email_templates").select("*");
  if (error) throw handleSupabaseError(error, "getEmailTemplates");
  return (data ?? []) as EmailTemplate[];
}

/**
 * Get email template by ID
 */
export async function getEmailTemplateById(
  id: string,
  client: any,
): Promise<EmailTemplate | null> {
  const { data, error } = await client
    .from("email_templates")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw handleSupabaseError(error, "getEmailTemplateById");
  return (data as EmailTemplate | null) ?? null;
}

/**
 * Create a new email template
 */
export async function createEmailTemplate(
  template: EmailTemplateInsert,
  client: any,
): Promise<EmailTemplate> {
  const { data, error } = await client
    .from("email_templates")
    .insert(template)
    .select()
    .single();
  if (error) throw handleSupabaseError(error, "createEmailTemplate");
  return data as EmailTemplate;
}

/**
 * Update an email template
 */
export async function updateEmailTemplate(
  id: string,
  updates: EmailTemplateUpdate,
  client: any,
): Promise<EmailTemplate> {
  const { data, error } = await client
    .from("email_templates")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw handleSupabaseError(error, "updateEmailTemplate");
  return data as EmailTemplate;
}

/**
 * Delete an email template
 */
export async function deleteEmailTemplate(
  id: string,
  client: any,
): Promise<void> {
  const { error } = await client.from("email_templates").delete().eq("id", id);
  if (error) throw handleSupabaseError(error, "deleteEmailTemplate");
}
