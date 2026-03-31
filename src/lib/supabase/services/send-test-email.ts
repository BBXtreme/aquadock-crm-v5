// src/app/actions/send-test-email.ts
"use server";

import nodemailer from "nodemailer";
import { getSmtpConfig } from "@/lib/supabase/services/smtp";

export async function sendTestEmail(toEmail: string) {
  if (!toEmail?.includes("@")) {
    throw new Error("Bitte eine gültige E-Mail-Adresse angeben");
  }

  const smtp = await getSmtpConfig();
  if (!smtp) {
    throw new Error("SMTP-Konfiguration fehlt. Bitte in den Einstellungen konfigurieren.");
  }

  if (!smtp.host || !smtp.user || !smtp.password) {
    throw new Error("SMTP Host, Benutzer oder Passwort fehlt.");
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: parseInt(String(smtp.port) || "587", 10),
    secure: smtp.secure === true || parseInt(String(smtp.port) || "587", 10) === 465,
    auth: {
      user: smtp.user,
      pass: smtp.password,
    },
    tls: { rejectUnauthorized: false },
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