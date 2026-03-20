import { createServerSupabaseClient, handleSupabaseError } from "../client";
import { Database } from "../database.types";

type Reminder = Database['public']['Tables']['reminders']['Row'];
type ReminderInsert = Database['public']['Tables']['reminders']['Insert'];
type ReminderUpdate = Database['public']['Tables']['reminders']['Update'];

export async function getAllReminders(): Promise<Reminder[]> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("reminders")
      .select("*")
      .order("due_date", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw handleSupabaseError(error, "getAllReminders");
  }
}

export async function getRemindersByCompany(companyId: string): Promise<Reminder[]> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("reminders")
      .select("*")
      .eq("company_id", companyId)
      .order("due_date", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw handleSupabaseError(error, "getRemindersByCompany");
  }
}

export async function getReminderById(id: string): Promise<Reminder | null> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("reminders")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleSupabaseError(error, "getReminderById");
  }
}

export async function createReminder(reminder: ReminderInsert): Promise<Reminder> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("reminders")
      .insert(reminder)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleSupabaseError(error, "createReminder");
  }
}

export async function updateReminder(id: string, updates: ReminderUpdate): Promise<Reminder> {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("reminders")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleSupabaseError(error, "updateReminder");
  }
}

export async function deleteReminder(id: string): Promise<void> {
  try {
    const supabase = createServerSupabaseClient();
    const { error } = await supabase
      .from("reminders")
      .delete()
      .eq("id", id);

    if (error) throw error;
  } catch (error) {
    throw handleSupabaseError(error, "deleteReminder");
  }
}
