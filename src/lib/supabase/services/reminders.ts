import { createServerSupabaseClient } from "../server";
import type {
  Reminder,
  ReminderInsert,
  ReminderUpdate,
} from "../database.types";

/**
 * Get all reminders with joined company data
 */
export async function getReminders(
  client = createServerSupabaseClient(),
): Promise<Reminder[]> {
  const { data, error } = await client
    .from("reminders")
    .select("*, companies(firmenname)");
  if (error) throw new Error(`Failed to fetch reminders: ${error.message}`);
  return data ?? [];
}

/**
 * Get reminder by ID
 */
export async function getReminderById(
  id: string,
  client = createServerSupabaseClient(),
): Promise<Reminder | null> {
  const { data, error } = await client
    .from("reminders")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(`Failed to fetch reminder: ${error.message}`);
  return data ?? null;
}

/**
 * Create a new reminder
 */
export async function createReminder(
  reminder: ReminderInsert,
  client = createServerSupabaseClient(),
): Promise<Reminder> {
  const { data, error } = await client
    .from("reminders")
    .insert(reminder)
    .select()
    .single();
  if (error) throw new Error(`Failed to create reminder: ${error.message}`);
  return data;
}

/**
 * Update a reminder
 */
export async function updateReminder(
  id: string,
  updates: ReminderUpdate,
  client = createServerSupabaseClient(),
): Promise<Reminder> {
  const { data, error } = await client
    .from("reminders")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`Failed to update reminder: ${error.message}`);
  return data;
}

/**
 * Delete a reminder
 */
export async function deleteReminder(
  id: string,
  client = createServerSupabaseClient(),
): Promise<void> {
  const { error } = await client.from("reminders").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete reminder: ${error.message}`);
}
