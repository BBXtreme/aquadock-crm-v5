import type { SupabaseClient } from "@supabase/supabase-js";
import { handleSupabaseError } from "@/lib/supabase/db-error-utils";
import type { Reminder, ReminderInsert, ReminderUpdate } from "@/types/database.types";

type ReminderWithCompany = Reminder & { companies?: { firmenname: string } | null };

/**
 * Get all reminders with joined company data
 */
export async function getReminders(client: SupabaseClient): Promise<ReminderWithCompany[]> {
  const { data, error } = await client
    .from("reminders")
    .select("*, companies!company_id (firmenname)")
    .is("deleted_at", null);
  if (error) throw handleSupabaseError(error, "getReminders");
  return data ?? [];
}

/**
 * Get reminder by ID
 */
export async function getReminderById(id: string, client: SupabaseClient): Promise<Reminder | null> {
  const { data, error } = await client
    .from("reminders")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw handleSupabaseError(error, "getReminderById");
  return data;
}

/**
 * Create a new reminder
 */
export async function createReminder(reminder: ReminderInsert, client: SupabaseClient): Promise<Reminder> {
  const { data, error } = await client.from("reminders").insert(reminder).select().single();
  if (error) throw handleSupabaseError(error, "createReminder");
  if (data == null) {
    throw new Error("createReminder: no row returned");
  }
  return data;
}

/**
 * Update a reminder
 */
export async function updateReminder(id: string, updates: ReminderUpdate, client: SupabaseClient): Promise<Reminder> {
  const { data, error } = await client.from("reminders").update(updates).eq("id", id).select().single();
  if (error) throw handleSupabaseError(error, "updateReminder");
  if (data == null) {
    throw new Error("updateReminder: no row returned");
  }
  return data;
}
