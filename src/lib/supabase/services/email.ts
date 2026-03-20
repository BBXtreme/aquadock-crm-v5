import { createServerSupabaseClient } from '../client';
import type { EmailLog, EmailLogInsert, EmailLogUpdate, EmailTemplate, EmailTemplateInsert, EmailTemplateUpdate } from '../database.types';

/**
 * Get all email logs
 */
export async function getEmailLogs(client = createServerSupabaseClient()): Promise<EmailLog[]> {
  const { data, error } = await client.from('email_log').select('*');
  if (error) throw new Error(`Failed to fetch email logs: ${error.message}`);
  return data ?? [];
}

/**
 * Get email log by ID
 */
export async function getEmailLogById(id: string, client = createServerSupabaseClient()): Promise<EmailLog | null> {
  const { data, error } = await client.from('email_log').select('*').eq('id', id).single();
  if (error) throw new Error(`Failed to fetch email log: ${error.message}`);
  return data ?? null;
}

/**
 * Create a new email log
 */
export async function createEmailLog(emailLog: EmailLogInsert, client = createServerSupabaseClient()): Promise<EmailLog> {
  const { data, error } = await client.from('email_log').insert(emailLog).select().single();
  if (error) throw new Error(`Failed to create email log: ${error.message}`);
  return data;
}

/**
 * Update an email log
 */
export async function updateEmailLog(id: string, updates: EmailLogUpdate, client = createServerSupabaseClient()): Promise<EmailLog> {
  const { data, error } = await client.from('email_log').update(updates).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update email log: ${error.message}`);
  return data;
}

/**
 * Delete an email log
 */
export async function deleteEmailLog(id: string, client = createServerSupabaseClient()): Promise<void> {
  const { error } = await client.from('email_log').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete email log: ${error.message}`);
}

/**
 * Get all email templates
 */
export async function getEmailTemplates(client = createServerSupabaseClient()): Promise<EmailTemplate[]> {
  const { data, error } = await client.from('email_templates').select('*');
  if (error) throw new Error(`Failed to fetch email templates: ${error.message}`);
  return data ?? [];
}

/**
 * Get email template by ID
 */
export async function getEmailTemplateById(id: string, client = createServerSupabaseClient()): Promise<EmailTemplate | null> {
  const { data, error } = await client.from('email_templates').select('*').eq('id', id).single();
  if (error) throw new Error(`Failed to fetch email template: ${error.message}`);
  return data ?? null;
}

/**
 * Create a new email template
 */
export async function createEmailTemplate(template: EmailTemplateInsert, client = createServerSupabaseClient()): Promise<EmailTemplate> {
  const { data, error } = await client.from('email_templates').insert(template).select().single();
  if (error) throw new Error(`Failed to create email template: ${error.message}`);
  return data;
}

/**
 * Update an email template
 */
export async function updateEmailTemplate(id: string, updates: EmailTemplateUpdate, client = createServerSupabaseClient()): Promise<EmailTemplate> {
  const { data, error } = await client.from('email_templates').update(updates).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update email template: ${error.message}`);
  return data;
}

/**
 * Delete an email template
 */
export async function deleteEmailTemplate(id: string, client = createServerSupabaseClient()): Promise<void> {
  const { error } = await client.from('email_templates').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete email template: ${error.message}`);
}
