import { formatApplicationReferenceId } from "./persistence";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildApplicantConfirmationEmail(args: {
  locale: "de" | "en";
  firstName: string;
  applicationId: string;
  privacyUrl: string;
}): { subject: string; html: string; text: string } {
  const ref = formatApplicationReferenceId(args.applicationId);
  const name = escapeHtml(args.firstName.trim());

  if (args.locale === "en") {
    const subject = "Your AquaDock Sales Partner Application — Received";
    const text = [
      `Hello ${args.firstName.trim()},`,
      "",
      "Thank you for applying to become an AquaDock sales partner.",
      "",
      `Reference: ${ref}`,
      "",
      "We will review your application personally and get back to you within 48 hours.",
      "",
      `Privacy policy: ${args.privacyUrl}`,
      "",
      "This message was sent automatically. Please do not reply directly to this email.",
      "",
      "— AquaDock",
    ].join("\n");

    const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:24px;background:#f3f6f4;font-family:Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #dce6e0;border-radius:12px;">
    <tr><td style="padding:28px 32px 8px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">AquaDock</td></tr>
    <tr><td style="padding:0 32px 12px;font-size:22px;font-weight:600;">Application received</td></tr>
    <tr><td style="padding:0 32px 16px;font-size:16px;line-height:1.6;">Hello ${name},</td></tr>
    <tr><td style="padding:0 32px 16px;font-size:15px;line-height:1.6;color:#334155;">Thank you for applying to become an AquaDock sales partner. We will review your application personally and contact you within <strong>48 hours</strong>.</td></tr>
    <tr><td style="padding:0 32px 20px;"><div style="background:#f6fbf7;border:1px solid #cfe5d8;border-radius:8px;padding:14px 16px;font-size:14px;">Reference: <strong>${escapeHtml(ref)}</strong></div></td></tr>
    <tr><td style="padding:0 32px 24px;font-size:13px;color:#64748b;"><a href="${escapeHtml(args.privacyUrl)}" style="color:#0ea5e9;">Privacy policy</a></td></tr>
  </table>
</body>
</html>`;

    return { subject, html, text };
  }

  const subject = "Ihre Bewerbung als Vertriebspartner — Eingang bestätigt";
  const text = [
    `Guten Tag ${args.firstName.trim()},`,
    "",
    "vielen Dank für Ihre Bewerbung als Vertriebspartner bei AquaDock.",
    "",
    `Referenznummer: ${ref}`,
    "",
    "Wir prüfen Ihre Unterlagen persönlich und melden uns innerhalb von 48 Stunden bei Ihnen.",
    "",
    `Datenschutz: ${args.privacyUrl}`,
    "",
    "Diese Nachricht wurde automatisch versendet. Bitte antworten Sie nicht direkt auf diese E-Mail.",
    "",
    "— AquaDock",
  ].join("\n");

  const html = `<!doctype html>
<html lang="de">
<body style="margin:0;padding:24px;background:#f3f6f4;font-family:Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #dce6e0;border-radius:12px;">
    <tr><td style="padding:28px 32px 8px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">AquaDock</td></tr>
    <tr><td style="padding:0 32px 12px;font-size:22px;font-weight:600;">Bewerbung eingegangen</td></tr>
    <tr><td style="padding:0 32px 16px;font-size:16px;line-height:1.6;">Guten Tag ${name},</td></tr>
    <tr><td style="padding:0 32px 16px;font-size:15px;line-height:1.6;color:#334155;">vielen Dank für Ihre Bewerbung als Vertriebspartner. Wir prüfen Ihre Unterlagen persönlich und melden uns innerhalb von <strong>48 Stunden</strong>.</td></tr>
    <tr><td style="padding:0 32px 20px;"><div style="background:#f6fbf7;border:1px solid #cfe5d8;border-radius:8px;padding:14px 16px;font-size:14px;">Referenznummer: <strong>${escapeHtml(ref)}</strong></div></td></tr>
    <tr><td style="padding:0 32px 24px;font-size:13px;color:#64748b;"><a href="${escapeHtml(args.privacyUrl)}" style="color:#0ea5e9;">Datenschutzerklärung</a></td></tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}
