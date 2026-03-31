// src/lib/supabase/services/send-test-email.ts
// server action to send a test email using the user's configured SMTP settings
"use server";

import nodemailer from "nodemailer";
import { createServerSupabaseClient as createClient } from "@/lib/supabase/server-client";

export async function sendTestEmail(toEmail: string) {
  if (!toEmail || !toEmail.includes("@")) {
    throw new Error("Bitte eine gültige E-Mail-Adresse angeben");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert");

  // Load SMTP config
  const { data: settings } = await supabase
    .from("user_settings")
    .select("value")
    .eq("user_id", user.id)
    .eq("key", "smtp_config")
    .maybeSingle();

  if (!settings?.value) {
    throw new Error("SMTP-Konfiguration fehlt. Bitte in den Einstellungen konfigurieren.");
  }

  const smtp = JSON.parse(settings.value);

  if (!smtp.host || !smtp.user || !smtp.password) {
    throw new Error("SMTP Host, Benutzer oder Passwort fehlt.");
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: parseInt(smtp.port || "587", 10),
    secure: smtp.secure === true || parseInt(smtp.port || "587", 10) === 465, // true for 465, false for other ports
    auth: {
      user: smtp.user,
      pass: smtp.password,
    },
    tls: {
      rejectUnauthorized: false, // often needed for self-signed or corporate SMTP
    },
  });

  const fromName = smtp.fromName || "AquaDock CRM";

  await transporter.sendMail({
    from: `"${fromName}" <${smtp.user}>`,
    to: toEmail,
    subject: "AquaDock CRM – SMTP Test ✅",
    text: `Hallo,\n\ndiese Test-E-Mail wurde erfolgreich über deinen konfigurierten SMTP-Server gesendet.\n\nViele Grüße\nDein AquaDock CRM Team`,
    html: `
      <h2>SMTP Test erfolgreich ✅</h2>
      <p>Hallo,</p>
      <p>diese Test-E-Mail wurde erfolgreich über deinen konfigurierten SMTP-Server gesendet.</p>
      <p><strong>AquaDock CRM v5</strong></p>
    `,
  });

  return { success: true, message: `Test-E-Mail erfolgreich an ${toEmail} gesendet` };
}

export async function saveSmtpConfig(config: {
  host: string;
  port: string;
  user: string;
  password: string;
  fromName: string;
  secure: boolean;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht authentifiziert");

  await supabase.from("user_settings").upsert({
    user_id: user.id,
    key: "smtp_config",
    value: JSON.stringify(config),
  });

  return { success: true };
}
