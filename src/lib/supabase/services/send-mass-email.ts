// src/lib/supabase/services/send-mass-email.ts
// This service handles sending mass emails to contacts or companies based on selected templates and recipient lists.

"use server";

import { promises as dns } from 'node:dns';
import nodemailer from "nodemailer";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { createEmailLog, fillPlaceholders, getMassEmailRecipients } from "./email";
import { getSmtpConfig } from "./smtp";

function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;
  const domain = email.split('@')[1];
  if (!domain || domain.includes('..') || domain.startsWith('.') || domain.endsWith('.')) return false;
  return true;
}

async function hasMXRecords(domain: string): Promise<boolean> {
  try {
    const mx = await dns.resolveMx(domain);
    return mx && mx.length > 0;
  } catch {
    return false;
  }
}

type SendMassEmailInput = {
  subject: string;
  body: string;
  mode: "contacts" | "companies";
  contact_ids?: string[];
  company_ids?: string[];
  delayMs?: number;
  testEmail?: string;
};

type Recipient = {
  id: string;
  email: string;
  firmenname?: string;
  vorname?: string;
  nachname?: string;
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

  if (input.testEmail) {
    if (!isValidEmail(input.testEmail)) {
      throw new Error("Ungültiges E-Mail-Format");
    }

    const domain = input.testEmail.split('@')[1];
    if (!domain) {
      throw new Error("Ungültige E-Mail-Adresse.");
    }
    if (!(await hasMXRecords(domain))) {
      throw new Error("Domain existiert nicht oder kann keine E-Mails empfangen");
    }

    // Send test email
    const rec = { email: input.testEmail, id: 'test', name: 'Test User', firmenname: 'Test', vorname: 'Test' };
    const finalSubject = fillPlaceholders(input.subject, rec);
    const finalBody = fillPlaceholders(input.body, rec);

    try {
      const info = await transporter.sendMail({
        from: `"${smtp.fromName || "AquaDock CRM"}" <${smtp.user}>`,
        to: input.testEmail,
        subject: finalSubject,
        html: finalBody,
      });

      console.log("Test email send info:", info);

      // Check for delivery issues
      if (info.rejected.length > 0 || info.response.includes("5.4.4") || info.response.includes("failed")) {
        const errorMessage = `Rejected: ${info.rejected.join(', ')} Response: ${info.response}`;
        await createEmailLog(
          {
            recipient_email: input.testEmail,
            recipient_name: rec.name,
            subject: finalSubject,
            status: "error",
            error_msg: errorMessage,
            user_id: user.id,
            mode: "test",
            template_name: "Testsendung",
          },
          supabase
        );
        return {
          success: false,
          sent: 0,
          errors: 1,
          total: 1,
          message: "Test-E-Mail wurde abgelehnt. Überprüfen Sie die Adresse.",
        };
      }

      // Log successful send
      await createEmailLog(
        {
          recipient_email: input.testEmail,
          recipient_name: rec.name,
          subject: finalSubject,
          status: "sent",
          user_id: user.id,
          mode: "test",
          template_name: "Testsendung",
        },
        supabase
      );

      return {
        success: true,
        sent: 1,
        errors: 0,
        total: 1,
        message: "Test-E-Mail erfolgreich gesendet.",
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Test email send error:", errorMessage);

      await createEmailLog(
        {
          recipient_email: input.testEmail,
          recipient_name: rec.name,
          subject: finalSubject,
          status: "error",
          error_msg: errorMessage,
          user_id: user.id,
          mode: "test",
          template_name: "Testsendung",
        },
        supabase
      );

      return {
        success: false,
        sent: 0,
        errors: 1,
        total: 1,
        message: "Test-E-Mail fehlgeschlagen aufgrund eines technischen Fehlers.",
      };
    }
  }

  // Generate unique batch_id for mass emails
  const batchId = crypto.randomUUID();

  // Get recipients
  const recipients = await getMassEmailRecipients(supabase, {
    mode: input.mode,
  });

  const selectedRecipients = recipients.filter((r: Recipient) =>
    input.mode === "contacts"
      ? input.contact_ids?.includes(r.id)
      : input.company_ids?.includes(r.id)
  );

  // Validate email addresses
  const validRecipients = selectedRecipients.filter(rec => isValidEmail(rec.email));
  const filteredCount = selectedRecipients.length - validRecipients.length;
  if (filteredCount > 0) {
    console.warn(`${filteredCount} ungültige E-Mail-Adressen wurden aus der Empfängerliste entfernt.`);
  }

  // Optional: Check MX records for first 80 addresses
  let finalRecipients = validRecipients;
  let mxFilteredCount = 0;
  if (validRecipients.length > 0) {
    const mxChecked = [];
    const toCheck = validRecipients.slice(0, 80);
    for (const rec of toCheck) {
      const domain = rec.email.split('@')[1];
      if (domain && await hasMXRecords(domain)) {
        mxChecked.push(rec);
      } else {
        console.warn(`Domain ${domain} hat keine MX-Records, Adresse ${rec.email} entfernt.`);
        mxFilteredCount++;
      }
    }
    if (mxFilteredCount > 0) {
      console.warn(`${mxFilteredCount} Adressen mit ungültigen MX-Records wurden entfernt.`);
    }
    finalRecipients = [...mxChecked, ...validRecipients.slice(80)];
  }

  if (finalRecipients.length === 0) {
    throw new Error("Keine Empfänger ausgewählt oder keine gültigen E-Mail-Adressen gefunden.");
  }

  const delay = input.delayMs || 1500;
  let sent = 0;
  let errors = 0;

  for (const rec of finalRecipients) {
    let finalSubject = "";
    let finalBody = "";

    try {
      finalSubject = fillPlaceholders(input.subject, rec);
      finalBody = fillPlaceholders(input.body, rec);

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
          recipient_name: rec.firmenname,
          subject: finalSubject,
          status: "sent",
          user_id: user.id,
          mode: "mass",
          template_name: "Manueller Versand",
          batch_id: batchId,
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
          recipient_name: rec.firmenname,
          subject: finalSubject,
          status: "error",
          error_msg: errorMessage,
          user_id: user.id,
          mode: "mass",
          template_name: "Manueller Versand",
          batch_id: batchId,
        },
        supabase
      );

      console.error(`Failed to send to ${rec.email}:`, errorMessage);
    }

    // Respect delay between emails
    if (delay > 0 && rec !== finalRecipients[finalRecipients.length - 1]) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return {
    success: true,
    sent,
    errors,
    total: finalRecipients.length,
    filteredCount: filteredCount + mxFilteredCount,
    message: `${sent} von ${finalRecipients.length} E-Mails versendet.`,
  };
}
