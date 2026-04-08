// src/lib/supabase/services/reminders.ts
// This file contains functions for managing reminders in the Supabase
// database. It includes functions to get all reminders, get a reminder
// by ID, create a new reminder, update an existing reminder, and delete
// a reminder.
// The functions use the Supabase client to interact with the database
// and handle errors using a utility function.
// The code is designed to be reusable across different parts of the app
// that need to access or modify reminders, and it includes type definitions
// for the reminder data structures to ensure type safety when working with
// reminders in the app.

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
  return (data ?? []) as ReminderWithCompany[];
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
  return data as Reminder | null;
}

/**
 * Create a new reminder
 */
export async function createReminder(reminder: ReminderInsert, client: SupabaseClient): Promise<Reminder> {
  const { data, error } = await client.from("reminders").insert(reminder).select().single();
  if (error) throw handleSupabaseError(error, "createReminder");
  return data as Reminder;
}

/**
 * Update a reminder
 */
export async function updateReminder(id: string, updates: ReminderUpdate, client: SupabaseClient): Promise<Reminder> {
  const { data, error } = await client.from("reminders").update(updates).eq("id", id).select().single();
  if (error) throw handleSupabaseError(error, "updateReminder");
  return data as Reminder;
}

