// src/lib/services/smtp.ts
"use server";

import { handleSupabaseError } from "@/lib/supabase/db-error-utils";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SmtpConfig = {
  host: string;
  port: string | number;
  user: string;
  password: string;
  fromName?: string;
  secure?: boolean;
};

/**
 * Get SMTP config for current user (server-side only)
 */
export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Nicht authentifiziert");

  const { data, error } = await supabase
    .from("user_settings")
    .select("value")
    .eq("user_id", user.id)
    .eq("key", "smtp_config")
    .maybeSingle();

  if (error) throw handleSupabaseError(error, "getSmtpConfig");
  if (!data?.value) return null;

  return JSON.parse(data.value) as SmtpConfig;
}

/**
 * Save / Update SMTP config – ALWAYS exactly ONE entry per user
 */
export async function saveSmtpConfig(config: SmtpConfig): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Nicht authentifiziert");

  const { error } = await supabase
    .from("user_settings")
    .upsert(
      {
        user_id: user.id,
        key: "smtp_config",
        value: JSON.stringify(config),
      },
      { onConflict: "user_id,key" }
    );

  if (error) throw handleSupabaseError(error, "saveSmtpConfig");

  return true;
}
