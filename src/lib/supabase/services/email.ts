import { createServerSupabaseClient } from '../client';
import type { EmailLog, EmailLogInsert, EmailLogUpdate, EmailTemplate, EmailTemplateInsert, EmailTemplateUpdate } from '../database.types';

export async function getEmailLogs(): Promise<EmailLog[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from('email_log').select('*');
  if (error) throw new Error(`Failed to fetch email logs: ${error.message}`);
  return data ?? [];
}

export async function getEmailLogById(id: string): Promise<EmailLog | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from('email_log').select('*').eq('id', id).single();
  if (error) throw new Error(`Failed to fetch email log: ${error.message}`);
  return data ?? null;
}

export async function createEmailLog(emailLog: EmailLogInsert): Promise<EmailLog> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from('email_log').insert(emailLog).select().single();
  if (error) throw new Error(`Failed to create email log: ${error.message}`);
  return data;
}

export async function updateEmailLog(id: string, updates: EmailLogUpdate): Promise<EmailLog> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from('email_log').update(updates).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update email log: ${error.message}`);
  return data;
}

export async function deleteEmailLog(id: string): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('email_log').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete email log: ${error.message}`);
}

export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from('email_templates').select('*');
  if (error) throw new Error(`Failed to fetch email templates: ${error.message}`);
  return data ?? [];
}

export async function getEmailTemplateById(id: string): Promise<EmailTemplate | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from('email_templates').select('*').eq('id', id).single();
  if (error) throw new Error(`Failed to fetch email template: ${error.message}`);
  return data ?? null;
}

export async function createEmailTemplate(template: EmailTemplateInsert): Promise<EmailTemplate> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from('email_templates').insert(template).select().single();
  if (error) throw new Error(`Failed to create email template: ${error.message}`);
  return data;
}

export async function updateEmailTemplate(id: string, updates: EmailTemplateUpdate): Promise<EmailTemplate> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from('email_templates').update(updates).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update email template: ${error.message}`);
  return data;
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('email_templates').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete email template: ${error.message}`);
}
