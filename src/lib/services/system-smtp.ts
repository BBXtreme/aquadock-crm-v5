// Server-only: transactional email via env SMTP (onboarding admin notifications — not user_settings).

import nodemailer from "nodemailer";

export type SystemSmtpEnvConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
};

export function getSystemSmtpConfigFromEnv(): SystemSmtpEnvConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const portRaw = process.env.SMTP_PORT?.trim();
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD?.trim();
  const from = process.env.SMTP_FROM?.trim();
  if (
    host === undefined ||
    host === "" ||
    portRaw === undefined ||
    portRaw === "" ||
    user === undefined ||
    user === "" ||
    password === undefined ||
    password === "" ||
    from === undefined ||
    from === ""
  ) {
    return null;
  }
  const port = Number.parseInt(portRaw, 10);
  if (Number.isNaN(port)) {
    return null;
  }
  return { host, port, user, password, from };
}

/** Comma-separated list from `ADMIN_NOTIFICATION_EMAILS`. */
export function getAdminNotificationEmailsFromEnv(): string[] {
  const raw = process.env.ADMIN_NOTIFICATION_EMAILS?.trim();
  if (raw === undefined || raw === "") {
    return [];
  }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export async function sendSystemHtmlEmail(input: {
  to: string[];
  subject: string;
  html: string;
}): Promise<void> {
  const cfg = getSystemSmtpConfigFromEnv();
  if (cfg === null) {
    throw new Error("System SMTP is not configured (SMTP_HOST, …).");
  }
  if (input.to.length === 0) {
    throw new Error("No email recipients.");
  }
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: {
      user: cfg.user,
      pass: cfg.password,
    },
    tls: { rejectUnauthorized: false },
  });
  await transporter.sendMail({
    from: cfg.from,
    to: input.to.join(", "),
    subject: input.subject,
    html: input.html,
  });
}
