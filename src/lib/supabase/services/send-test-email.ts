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
    debug: true,
    logger: true,
  });

  const fromName = smtp.fromName || "AquaDock CRM";

  try {
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
  } catch (error: unknown) {
    const err = error as any;
    let message = "Unbekannter SMTP-Fehler";

    if (err.code === "ECONNREFUSED") {
      message = "Verbindung abgelehnt. Überprüfe Host und Port.";
    } else if (err.code === "ETIMEDOUT") {
      message = "Zeitüberschreitung. Der SMTP-Server antwortet nicht.";
    } else if (err.code === "EAUTH") {
      message = "Authentifizierung fehlgeschlagen. Überprüfe Benutzername und Passwort.";
    } else if (err.code === "EENVELOPE") {
      message = "Ungültige E-Mail-Adresse oder Envelope-Fehler.";
    } else if (err.responseCode === 535) {
      message = "Authentifizierung fehlgeschlagen (falsches Passwort).";
    } else if (err.responseCode === 550) {
      message = "E-Mail-Adresse nicht gefunden oder blockiert.";
    } else if (err.message) {
      message = err.message;
    }

    throw new Error(`SMTP-Fehler: ${message}`);
  }

  return { success: true, message: `Test-E-Mail erfolgreich an ${toEmail} gesendet` };
}
