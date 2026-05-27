import type { PartnerApplicationSubmitInput } from "@/lib/validations/partner-application";
import { formatApplicationReferenceId } from "./persistence";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function row(label: string, value: string): string {
  return `<tr>
  <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:600;color:#64748b;width:38%;vertical-align:top;">${escapeHtml(label)}</td>
  <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;vertical-align:top;">${escapeHtml(value)}</td>
</tr>`;
}

export function buildAdminNotificationEmail(args: {
  input: PartnerApplicationSubmitInput;
  applicationId: string;
  cvDownloadUrl: string | null;
  adminListUrl: string;
}): { subject: string; html: string; text: string } {
  const ref = formatApplicationReferenceId(args.applicationId);
  const subject = `[Vertriebspartner] Neue Bewerbung — ${args.input.lastName}, ${args.input.cityRegion}`;

  const fields: [string, string][] = [
    ["Referenz", ref],
    ["UUID", args.applicationId],
    ["Locale", args.input.locale],
    ["Name", `${args.input.firstName} ${args.input.lastName}`],
    ["E-Mail", args.input.email],
    ["Telefon", args.input.phone],
    ["Firma", args.input.companyName?.trim() || "—"],
    ["Land", args.input.countryCode],
    ["Stadt/Region", args.input.cityRegion],
    ["Gebiet", args.input.proposedTerritory],
    ["Vertriebserfahrung (Jahre)", String(args.input.yearsSalesExperience)],
    ["Branchen", args.input.industryExperience.join(", ")],
    ["Motivation", args.input.motivation],
    ["LinkedIn", args.input.linkedinUrl?.trim() || "—"],
    ["Referenzen", args.input.referencesText?.trim() || "—"],
    ["Steuernummer", args.input.taxId?.trim() || "—"],
    ["Handelsvertreter bestätigt", args.input.handelsvertreterAck ? "Ja" : "Nein"],
  ];

  const rowsHtml = fields.map(([l, v]) => row(l, v)).join("\n");
  const cvLine =
    args.cvDownloadUrl != null
      ? `<p style="margin:16px 0 0;font-size:14px;"><a href="${escapeHtml(args.cvDownloadUrl)}" style="color:#0ea5e9;">Lebenslauf herunterladen</a> (Link 7 Tage gültig)</p>`
      : `<p style="margin:16px 0 0;font-size:14px;color:#64748b;">Kein Lebenslauf angehängt.</p>`;

  const html = `<!doctype html>
<html lang="de">
<body style="margin:0;padding:24px;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table role="presentation" width="100%" style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;">
    <tr><td style="padding:24px 24px 8px;font-size:20px;font-weight:600;">Neue Vertriebspartner-Bewerbung</td></tr>
    <tr><td style="padding:0 24px 16px;font-size:14px;color:#64748b;">Eingegangen über aquadock.eu</td></tr>
    <tr><td style="padding:0 16px 16px;"><table role="presentation" width="100%" style="border-collapse:collapse;">${rowsHtml}</table>${cvLine}<p style="margin:16px 0 0;font-size:14px;"><a href="${escapeHtml(args.adminListUrl)}" style="color:#0ea5e9;">Im CRM öffnen</a></p></td></tr>
  </table>
</body>
</html>`;

  const text = [
    "Neue Vertriebspartner-Bewerbung",
    "",
    ...fields.map(([l, v]) => `${l}: ${v}`),
    "",
    args.cvDownloadUrl != null ? `CV: ${args.cvDownloadUrl}` : "Kein Lebenslauf",
    `CRM: ${args.adminListUrl}`,
  ].join("\n");

  return { subject, html, text };
}

export function getPartnerApplicationNotifyEmail(): string {
  return process.env.PARTNER_APPLICATION_NOTIFY_EMAIL?.trim() || "info@aquadock.de";
}

export function getPartnerApplicationPrivacyUrl(locale: "de" | "en"): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://aquadock.eu").replace(/\/$/, "");
  return locale === "en" ? `${base}/en/privacy/` : `${base}/de/datenschutz/`;
}

export function getPartnerApplicationAdminListUrl(): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://crm.aquadock.eu").replace(/\/$/, "");
  const crmBase = process.env.CRM_PUBLIC_URL?.trim()?.replace(/\/$/, "") ?? base;
  return `${crmBase}/admin/partner-applications`;
}
