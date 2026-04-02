// src/lib/supabase/services/email-log.ts
// This file contains functions for managing email logs in the Supabase database.
// It includes functions to get all email logs, get by ID, create new entries, update existing entries, and delete entries.
// The functions use the Supabase client to interact with the database and handle errors using a utility function.
// The code is designed to be reusable across different parts of the app that need to access or modify email logs.

import { createClient } from "@/lib/supabase/browser";
import { handleSupabaseError } from "@/lib/supabase/db-error-utils";
import type { Database } from "@/types/database.types";

type EmailLog = Database["public"]["Tables"]["email_log"]["Row"];
type EmailLogInsert = Database["public"]["Tables"]["email_log"]["Insert"];
type EmailLogUpdate = Database["public"]["Tables"]["email_log"]["Update"];

export async function getAllEmailLogs(): Promise<EmailLog[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from("email_log").select("*").order("sent_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw handleSupabaseError(error, "getAllEmailLogs");
  }
}

export async function getEmailLogById(id: string): Promise<EmailLog | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from("email_log").select("*").eq("id", id).single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleSupabaseError(error, "getEmailLogById");
  }
}

export async function createEmailLog(emailLog: EmailLogInsert): Promise<EmailLog> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from("email_log").insert(emailLog).select().single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleSupabaseError(error, "createEmailLog");
  }
}

export async function updateEmailLog(id: string, updates: EmailLogUpdate): Promise<EmailLog> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from("email_log").update(updates).eq("id", id).select().single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleSupabaseError(error, "updateEmailLog");
  }
}

export async function deleteEmailLog(id: string): Promise<void> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from("email_log").delete().eq("id", id);

    if (error) throw error;
  } catch (error) {
    throw handleSupabaseError(error, "deleteEmailLog");
  }
}
