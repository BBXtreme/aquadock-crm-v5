import { type NextRequest, NextResponse } from "next/server";

import nodemailer from "nodemailer";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getUserSettings } from "@/lib/supabase/services/user-settings";

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { recipient } = await request.json();

    if (!recipient || !recipient.includes("@")) {
      return NextResponse.json({ error: "Invalid recipient email" }, { status: 400 });
    }

    const settings = await getUserSettings(user.id);

    const smtpHost = settings.find((s) => s.key === "smtp_host")?.value as string;
    const smtpPort = parseInt((settings.find((s) => s.key === "smtp_port")?.value as string) || "587", 10);
    const smtpUsername = settings.find((s) => s.key === "smtp_username")?.value as string;
    const smtpPassword = settings.find((s) => s.key === "smtp_password")?.value as string;
    const smtpSenderName = settings.find((s) => s.key === "smtp_sender_name")?.value as string;

    if (!smtpHost || !smtpUsername || !smtpPassword || !smtpSenderName) {
      return NextResponse.json({ error: "SMTP settings not configured" }, { status: 400 });
    }

    const transporter = nodemailer.createTransporter({
      host: smtpHost,
      port: smtpPort,
      auth: {
        user: smtpUsername,
        pass: smtpPassword,
      },
    });

    const mailOptions = {
      from: `"${smtpSenderName}" <${smtpUsername}>`,
      to: recipient,
      subject: "Test Email from AquaDock CRM",
      text: "This is a test email sent from your AquaDock CRM SMTP configuration.",
      html: "<p>This is a test email sent from your <strong>AquaDock CRM</strong> SMTP configuration.</p>",
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ message: "Test email sent successfully" });
  } catch (error) {
    console.error("Error sending test email:", error);
    return NextResponse.json({ error: "Failed to send test email" }, { status: 500 });
  }
}
