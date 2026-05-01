import { getInAppNotificationActionPath } from "@/lib/notifications/in-app-action-path";
import { getPublicSiteUrl } from "@/lib/utils/site-url";
import type { UserNotification } from "@/types/database.types";

const copy = {
  cta: "In AquaDock öffnen",
  intro: "Du hast eine neue Benachrichtigung in AquaDock CRM.",
  introMirror: "Admin-Überblick: Benachrichtigung aus dem CRM-Feed.",
  bodyLabel: "Inhalt",
  linkLabel: "Link zur Ansicht in AquaDock (falls der Button nicht funktioniert):",
  brand: "AquaDock CRM",
} as const;

const MAX_SUBJECT = 200;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function trimSubject(title: string): string {
  const t = title.trim();
  if (t.length <= MAX_SUBJECT) {
    return t;
  }
  return `${t.slice(0, MAX_SUBJECT - 1)}…`;
}

/**
 * German-primary transactional copy; HTML is table-based for common mail clients.
 */
export function buildNotificationEmailContent(
  row: UserNotification,
  isAdminMirror: boolean,
): { subject: string; html: string; text: string } {
  const path = getInAppNotificationActionPath(row);
  const base = getPublicSiteUrl();
  const actionUrl = path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;

  const subject = trimSubject(row.title);
  const bodyRaw = row.body != null && row.body.trim() !== "" ? row.body.trim() : "";
  const intro = isAdminMirror ? copy.introMirror : copy.intro;

  const bodyHtml =
    bodyRaw === "" ? "" : `${escapeHtml(bodyRaw).replace(/\n/g, "<br/>")}`;

  const textParts: string[] = [intro, "", subject];
  if (bodyRaw !== "") {
    textParts.push("", `${copy.bodyLabel}:`, bodyRaw, "");
  }
  textParts.push(copy.cta, actionUrl, "", `— ${copy.brand}`);

  const text = textParts.join("\n");

  const inner =
    bodyHtml === ""
      ? ""
      : `<tr>
  <td style="padding:0 0 16px 0;font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#334155;">
    <p style="margin:0 0 8px 0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:#64748b;">${copy.bodyLabel}</p>
    <div style="color:#0f172a;">${bodyHtml}</div>
  </td>
</tr>`;

  const html = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">
          <tr>
            <td style="padding:24px 24px 8px 24px;font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.02em;color:#0ea5e9;text-transform:uppercase;">${copy.brand}</p>
              <h1 style="margin:12px 0 0 0;font-size:18px;font-weight:600;line-height:1.35;color:#0f172a;">${escapeHtml(subject)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 8px 24px;font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#475569;">
              ${escapeHtml(intro)}
            </td>
          </tr>
          ${inner}
          <tr>
            <td style="padding:8px 24px 8px 24px;">
              <a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:12px 20px;background:#0ea5e9;color:#ffffff;text-decoration:none;border-radius:6px;font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;">${copy.cta}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 24px 24px;font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#94a3b8;">
              ${copy.linkLabel}<br/>
              <a href="${escapeHtml(actionUrl)}" style="color:#0284c7;word-break:break-all;">${escapeHtml(actionUrl)}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}
