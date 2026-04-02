// src/lib/services/email-log.ts
// Server Actions for Email Log CRUD

"use server";

import { handleSupabaseError } from "@/lib/supabase/db-error-utils";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { EmailLog, EmailLogInsert, EmailLogUpdate } from "@/types/database.types";

export async function getAllEmailLogs(): Promise<EmailLog[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("email_log")
    .select("*")
    .order("sent_at", { ascending: false });

  if (error) throw handleSupabaseError(error, "getAllEmailLogs");
  return data ?? [];
}

export async function getEmailLogById(id: string): Promise<EmailLog | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("email_log")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw handleSupabaseError(error, "getEmailLogById");
  return data ?? null;
}

export async function createEmailLog(emailLog: EmailLogInsert): Promise<EmailLog> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("email_log")
    .insert(emailLog)
    .select()
    .single();

  if (error) throw handleSupabaseError(error, "createEmailLog");
  return data;
}

export async function updateEmailLog(id: string, updates: EmailLogUpdate): Promise<EmailLog> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("email_log")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw handleSupabaseError(error, "updateEmailLog");
  return data;
}

export async function deleteEmailLog(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("email_log")
    .delete()
    .eq("id", id);

  if (error) throw handleSupabaseError(error, "deleteEmailLog");
}