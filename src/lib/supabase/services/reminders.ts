import { createServerSupabaseClient } from '../client';
import type { Reminder, ReminderInsert, ReminderUpdate } from '../database.types';

export async function getReminders(): Promise<Reminder[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from('reminders').select('*');
  if (error) throw new Error(`Failed to fetch reminders: ${error.message}`);
  return data ?? [];
}

export async function getReminderById(id: string): Promise<Reminder | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from('reminders').select('*').eq('id', id).single();
  if (error) throw new Error(`Failed to fetch reminder: ${error.message}`);
  return data ?? null;
}

export async function createReminder(reminder: ReminderInsert): Promise<Reminder> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from('reminders').insert(reminder).select().single();
  if (error) throw new Error(`Failed to create reminder: ${error.message}`);
  return data;
}

export async function updateReminder(id: string, updates: ReminderUpdate): Promise<Reminder> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from('reminders').update(updates).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update reminder: ${error.message}`);
  return data;
}

export async function deleteReminder(id: string): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('reminders').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete reminder: ${error.message}`);
}
