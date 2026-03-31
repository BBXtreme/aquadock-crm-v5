// src/lib/supabase/services/send-mass-email.ts
// This service handles sending mass emails to contacts or companies based on selected templates and recipient lists.

"use server";

import nodemailer from "nodemailer";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { createEmailLog, fillPlaceholders, getMassEmailRecipients } from "./email";
import { getSmtpConfig } from "./smtp";

type SendMassEmailInput = {
  subject: string;
  body: string;
  mode: "contacts" | "companies";
  contact_ids?: string[];
  company_ids?: string[];
  delayMs?: number;
};

export async function sendMassEmailAction(input: SendMassEmailInput) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Nicht authentifiziert");
  }

  // Get SMTP config using the clean service
  const smtp = await getSmtpConfig();
  if (!smtp) {
    throw new Error("SMTP-Konfiguration fehlt. Bitte in den Einstellungen konfigurieren.");
  }

  if (!smtp.host || !smtp.user || !smtp.password) {
    throw new Error("SMTP-Konfiguration unvollständig.");
  }

  // Setup transporter
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

  // Get recipients
  const recipients = await getMassEmailRecipients(supabase, {
    mode: input.mode,
  });

  const selectedRecipients = recipients.filter((r) =>
    input.mode === "contacts"
      ? input.contact_ids?.includes(r.id)
      : input.company_ids?.includes(r.id)
  );

  if (selectedRecipients.length === 0) {
    throw new Error("Keine Empfänger ausgewählt oder keine gültigen E-Mail-Adressen gefunden.");
  }

  const delay = input.delayMs || 1500;
  let sent = 0;
  let errors = 0;

  for (const rec of selectedRecipients) {
    try {
      const finalSubject = fillPlaceholders(input.subject, rec);
      const finalBody = fillPlaceholders(input.body, rec);

      await transporter.sendMail({
        from: `"${smtp.fromName || "AquaDock CRM"}" <${smtp.user}>`,
        to: rec.email,
        subject: finalSubject,
        html: finalBody,
      });

      // Log successful send
      await createEmailLog(
        {
          recipient_email: rec.email,
          subject: finalSubject,
          body: finalBody.length > 100 ? `${finalBody.substring(0, 100)}...` : finalBody,
          status: "sent",
        },
        supabase
      );

      sent++;
    } catch (err: unknown) {
      errors++;

      const errorMessage = err instanceof Error ? err.message : String(err);

      await createEmailLog(
        {
          recipient_email: rec.email,
          subject: input.subject,
          body: errorMessage,
          status: "error",
        },
        supabase
      );

      console.error(`Failed to send to ${rec.email}:`, errorMessage);
    }

    // Respect delay between emails
    if (delay > 0 && rec !== selectedRecipients[selectedRecipients.length - 1]) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return {
    success: true,
    sent,
    errors,
    total: selectedRecipients.length,
    message: `${sent} von ${selectedRecipients.length} E-Mails versendet.`,
  };
}
