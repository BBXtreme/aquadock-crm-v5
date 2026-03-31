import { type NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
    }

    const { host, port, username, password, fromName, secure, recipient } = await request.json();

    if (!host || !port || !username || !password || !recipient) {
      return NextResponse.json({ error: 'Unvollständige SMTP-Konfiguration' }, { status: 400 });
    }

    const transporter = nodemailer.createTransporter({
      host,
      port: parseInt(port, 10),
      secure: secure || false,
      auth: {
        user: username,
        pass: password,
      },
    });

    await transporter.sendMail({
      from: `"${fromName || 'AquaDock CRM'}" <${username}>`,
      to: recipient,
      subject: 'SMTP Test - AquaDock CRM',
      html: `
        <h1>SMTP Test erfolgreich!</h1>
        <p>Diese E-Mail wurde erfolgreich über Ihre SMTP-Konfiguration gesendet.</p>
        <p>Konfiguration:</p>
        <ul>
          <li>Host: ${host}</li>
          <li>Port: ${port}</li>
          <li>Username: ${username}</li>
          <li>From Name: ${fromName || 'AquaDock CRM'}</li>
          <li>SSL/TLS: ${secure ? 'Ja' : 'Nein'}</li>
        </ul>
        <p>Zeit: ${new Date().toLocaleString('de-DE')}</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('SMTP Test error:', error);
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
