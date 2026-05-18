function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function isPlaceholderInviteEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (normalized.length === 0) {
    return true;
  }
  return (
    normalized.endsWith("@aquadock.invalid") ||
    normalized.startsWith("draft-") ||
    normalized.startsWith("pending-")
  );
}

export function buildStandortanalyseInviteEmailContent(args: {
  shareUrl: string;
  expiresAt: string;
  passwordProtected: boolean;
  recipientName?: string | null;
}): { subject: string; html: string; text: string } {
  const expiresLabel = new Date(args.expiresAt).toLocaleString("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const recipientName = args.recipientName?.trim() ?? "";
  const greetingPlain = recipientName.length > 0 ? `Guten Tag ${recipientName},` : "Guten Tag,";
  const greeting = escapeHtml(greetingPlain);
  const shareUrlHtml = escapeHtml(args.shareUrl);
  const passwordHint = args.passwordProtected
    ? `<tr>
  <td style="padding:0 32px 20px 32px;">
    <div style="border-radius:12px;border:1px solid #cfe5d8;background:#f6fbf7;padding:14px 16px;color:#184b2a;font-size:14px;line-height:1.5;">
      Dieser Link ist passwortgeschützt. Das Passwort erhalten Sie separat von Ihrem Ansprechpartner.
    </div>
  </td>
</tr>`
    : "";
  const passwordText = args.passwordProtected
    ? "Der Link ist passwortgeschützt. Das Passwort erhalten Sie separat von Ihrem Ansprechpartner.\n\n"
    : "";

  const subject = "Einladung zur AquaDock Standortanalyse";
  const html = `<!doctype html>
<html lang="de">
  <body style="margin:0;padding:24px;background:#f3f6f4;font-family:Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;border-collapse:collapse;">
            <tr>
              <td style="padding:0 0 12px 0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">
                AquaDock CRM
              </td>
            </tr>
            <tr>
              <td style="border:1px solid #dce6e0;border-radius:18px;background:#ffffff;padding:0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:28px 32px 10px 32px;font-size:24px;line-height:1.2;font-weight:600;color:#0f172a;">
                      Einladung zur Standortanalyse
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 32px 18px 32px;font-size:16px;line-height:1.6;color:#1e293b;">
                      ${greeting}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 32px 18px 32px;font-size:15px;line-height:1.6;color:#334155;">
                      bitte fülle die Standortanalyse über den folgenden sicheren Link aus. Die Angaben werden vertraulich behandelt und von unserem Team fachlich ausgewertet.
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 32px 18px 32px;">
                      <a href="${shareUrlHtml}" style="display:inline-block;background:#ff6f00;color:#ffffff;text-decoration:none;font-weight:600;border-radius:999px;padding:12px 20px;font-size:15px;line-height:1.2;">
                        Standortanalyse starten
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 32px 18px 32px;font-size:13px;line-height:1.6;color:#64748b;word-break:break-all;">
                      Falls der Button nicht funktioniert: <a href="${shareUrlHtml}" style="color:#0f766e;text-decoration:underline;">${shareUrlHtml}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 32px 20px 32px;font-size:14px;line-height:1.6;color:#334155;">
                      Gültig bis <strong>${escapeHtml(expiresLabel)}</strong>.
                    </td>
                  </tr>
                  ${passwordHint}
                  <tr>
                    <td style="padding:0 32px 30px 32px;font-size:15px;line-height:1.7;color:#334155;">
                      Vielen Dank für Deine Zeit.<br/>
                      <span style="color:#0f172a;font-weight:600;">Dein AquaDock Team</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `${greetingPlain}

bitte fülle die Standortanalyse über den folgenden sicheren Link aus:

${args.shareUrl}

Der Link ist gültig bis ${expiresLabel}.

${passwordText}Vielen Dank.
Ihr AquaDock Team`;

  return { subject, html, text };
}

export function buildStandortanalyseSubmissionConfirmationEmailContent(args: {
  analysisId: string;
}): { subject: string; html: string; text: string } {
  const analysisIdHtml = escapeHtml(args.analysisId);
  const subject = "Deine AquaDock Standortanalyse ist eingegangen";
  const html = `<!doctype html>
<html lang="de">
  <body style="margin:0;padding:24px;background:#f3f6f4;font-family:Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;border-collapse:collapse;">
            <tr>
              <td style="padding:0 0 12px 0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">
                AquaDock CRM
              </td>
            </tr>
            <tr>
              <td style="border:1px solid #dce6e0;border-radius:18px;background:#ffffff;padding:28px 32px;">
                <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.2;font-weight:600;color:#0f172a;">
                  Vielen Dank fuer Deine Anfrage
                </h1>
                <p style="margin:0 0 12px 0;font-size:15px;line-height:1.65;color:#334155;">
                  wir haben Deine Standortanalyse erfolgreich erhalten. Unser Team prueft die Angaben und meldet sich zeitnah mit der fachlichen Einschaetzung und den naechsten Schritten.
                </p>
                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.65;color:#475569;">
                  Referenz: <strong style="color:#0f172a;">${analysisIdHtml}</strong>
                </p>
                <div style="border-radius:12px;border:1px solid #d8e7df;background:#f7fbf9;padding:12px 14px;font-size:14px;line-height:1.55;color:#1e293b;">
                  Ueblich ist eine erste Rueckmeldung innerhalb von 1-2 Werktagen.
                </div>
                <p style="margin:18px 0 0 0;font-size:15px;line-height:1.65;color:#334155;">
                  Dein AquaDock Team
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `Vielen Dank fuer Deine Anfrage.

Wir haben Deine Standortanalyse erfolgreich erhalten. Unser Team prueft die Angaben und meldet sich zeitnah mit der fachlichen Einschaetzung und den naechsten Schritten.

Referenz: ${args.analysisId}

Ueblich ist eine erste Rueckmeldung innerhalb von 1-2 Werktagen.

Dein AquaDock Team`;

  return { subject, html, text };
}
