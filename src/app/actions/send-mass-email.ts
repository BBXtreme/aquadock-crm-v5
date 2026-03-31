'use server';

import { revalidatePath } from 'next/cache';
import nodemailer from 'nodemailer';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import { createEmailLog, fillPlaceholders, getMassEmailRecipients } from '@/lib/supabase/services/email';

type SendMassEmailInput = {
  recipientIds: string[];
  mode: 'contacts' | 'companies';
  subject: string;
  body: string;
  templateId?: string;
  delayMs?: number;
};

export async function sendMassEmailAction(input: SendMassEmailInput) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Nicht authentifiziert');
  }

  // Get SMTP config from user_settings
  const { data: settings } = await supabase
    .from('user_settings')
    .select('value')
    .eq('user_id', user.id)
    .eq('key', 'smtp_config')
    .maybeSingle();

  if (!settings?.value) {
    throw new Error('SMTP-Konfiguration fehlt. Bitte in den Einstellungen konfigurieren.');
  }

  const smtp = JSON.parse(settings.value);

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port || 587,
    secure: smtp.secure || false,
    auth: {
      user: smtp.user,
      pass: smtp.password,
    },
  });

  const recipients = await getMassEmailRecipients(
    supabase, // pass server client
    { mode: input.mode }
  );

  const selected = recipients.filter((r) => input.recipientIds.includes(r.id));

  if (selected.length === 0) {
    throw new Error('Keine Empfänger ausgewählt');
  }

  let sent = 0;
  let failed = 0;

  for (const rec of selected) {
    try {
      const finalSubject = fillPlaceholders(input.subject, rec);
      const finalBody = fillPlaceholders(input.body, rec);

      await transporter.sendMail({
        from: `"AquaDock CRM" <${smtp.user}>`,
        to: rec.email,
        subject: finalSubject,
        html: finalBody,
      });

      await createEmailLog(
        {
          recipient_email: rec.email,
          subject: finalSubject,
          body: finalBody,
          status: 'sent',
        },
        supabase
      );

      sent++;
    } catch (err: unknown) {
      failed++;
      await createEmailLog(
        {
          recipient_email: rec.email,
          subject: input.subject,
          body: input.body,
          status: 'error',
        },
        supabase
      );
      console.error(`Failed to send to ${rec.email}:`, (err as Error).message);
    }

    // Small delay to be nice to the SMTP server
    if (input.delayMs && input.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, input.delayMs));
    }
  }

  revalidatePath('/mass-email');

  return {
    success: true,
    sent,
    failed,
    total: selected.length,
  };
}
