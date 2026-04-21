// src/lib/services/smtp.ts
"use server";

import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";
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

function isUsableSmtpConfig(cfg: SmtpConfig): boolean {
  return (
    typeof cfg.host === "string" &&
    cfg.host.length > 0 &&
    typeof cfg.user === "string" &&
    cfg.user.length > 0 &&
    typeof cfg.password === "string" &&
    cfg.password.length > 0
  );
}

function parseSmtpConfigFromStoredValue(
  raw: string | null | undefined,
): SmtpConfig | null {
  if (raw === undefined || raw === null || raw === "") {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    const o = parsed as Record<string, unknown>;
    const host = o.host;
    const port = o.port;
    const user = o.user;
    const password = o.password;
    const fromName = o.fromName;
    const secure = o.secure;
    if (typeof host !== "string" || typeof user !== "string" || typeof password !== "string") {
      return null;
    }
    const cfg: SmtpConfig = {
      host,
      port:
        typeof port === "number"
          ? port
          : typeof port === "string"
            ? port
            : "587",
      user,
      password,
    };
    if (typeof fromName === "string") {
      cfg.fromName = fromName;
    }
    if (typeof secure === "boolean") {
      cfg.secure = secure;
    }
    return isUsableSmtpConfig(cfg) ? cfg : null;
  } catch {
    return null;
  }
}

/**
 * SMTP for server-triggered notifications (onboarding, etc.): prefer the acting admin's
 * `user_settings.smtp_config`, otherwise the first admin account that has SMTP saved.
 * Returns `null` if no usable config exists (logs a warning).
 */
export async function getSystemSmtpConfigForNotifications(
  actingAdminUserId?: string | null,
): Promise<SmtpConfig | null> {
  const admin = createAdminClient();

  const loadForUser = async (userId: string): Promise<SmtpConfig | null> => {
    const { data, error } = await admin
      .from("user_settings")
      .select("value")
      .eq("user_id", userId)
      .eq("key", "smtp_config")
      .maybeSingle();
    if (error !== null) {
      return null;
    }
    const raw = data?.value;
    if (typeof raw !== "string") {
      return null;
    }
    return parseSmtpConfigFromStoredValue(raw);
  };

  if (
    actingAdminUserId !== undefined &&
    actingAdminUserId !== null &&
    actingAdminUserId !== ""
  ) {
    const primary = await loadForUser(actingAdminUserId);
    if (primary !== null) {
      return primary;
    }
  }

  const { data: adminRows, error: listErr } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "admin");

  if (listErr !== null || adminRows === null || adminRows.length === 0) {
    console.warn(
      "[smtp] No SMTP config for notifications: no admin profiles found.",
    );
    return null;
  }

  for (const row of adminRows) {
    const cfg = await loadForUser(row.id);
    if (cfg !== null) {
      return cfg;
    }
  }

  console.warn(
    "[smtp] No SMTP config for notifications: no admin has smtp_config in user_settings (Settings → SMTP).",
  );
  return null;
}

/**
 * Send HTML mail using {@link getSystemSmtpConfigForNotifications} (same transport as mass-email / settings).
 * No-op when no recipients or no SMTP config (warning already logged).
 */
export async function sendNotificationHtmlEmail(input: {
  actingAdminUserId?: string | null;
  to: string[];
  subject: string;
  html: string;
}): Promise<void> {
  if (input.to.length === 0) {
    return;
  }
  const smtp = await getSystemSmtpConfigForNotifications(input.actingAdminUserId);
  if (smtp === null) {
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: Number.parseInt(String(smtp.port) || "587", 10),
    secure:
      smtp.secure === true ||
      Number.parseInt(String(smtp.port) || "587", 10) === 465,
    auth: {
      user: smtp.user,
      pass: smtp.password,
    },
    tls: { rejectUnauthorized: false },
  });

  const fromName = smtp.fromName || "AquaDock CRM";

  await transporter.sendMail({
    from: `"${fromName}" <${smtp.user}>`,
    to: input.to.join(", "),
    subject: input.subject,
    html: input.html,
  });
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
