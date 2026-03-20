import { handleSupabaseError } from "../utils";
import type {
  Reminder,
  ReminderInsert,
  ReminderUpdate,
} from "../database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Get all reminders with joined company data
 */
export async function getReminders(
  client: SupabaseClient,
): Promise<Reminder[]> {
  const { data, error } = await client
    .from("reminders")
    .select("*, companies!company_id (firmenname)");
  if (error) throw handleSupabaseError(error, "getReminders");
  return (data ?? []) as Reminder[];
}

/**
 * Get reminder by ID
 */
export async function getReminderById(
  id: string,
  client: SupabaseClient,
): Promise<Reminder | null> {
  const { data, error } = await client
    .from("reminders")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw handleSupabaseError(error, "getReminderById");
  return (data as Reminder | null) ?? null;
}

/**
 * Create a new reminder
 */
export async function createReminder(
  reminder: ReminderInsert,
  client: SupabaseClient,
): Promise<Reminder> {
  const { data, error } = await client
    .from("reminders")
    .insert(reminder)
    .select()
    .single();
  if (error) throw handleSupabaseError(error, "createReminder");
  return data as Reminder;
}

/**
 * Update a reminder
 */
export async function updateReminder(
  id: string,
  updates: ReminderUpdate,
  client: SupabaseClient,
): Promise<Reminder> {
  const { data, error } = await client
    .from("reminders")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw handleSupabaseError(error, "updateReminder");
  return data as Reminder;
}

/**
 * Delete a reminder
 */
export async function deleteReminder(
  id: string,
  client: SupabaseClient,
): Promise<void> {
  const { error } = await client.from("reminders").delete().eq("id", id);
  if (error) throw handleSupabaseError(error, "deleteReminder");
}
