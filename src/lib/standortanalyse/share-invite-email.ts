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
    ? "<p>Der Link ist passwortgeschützt. Das Passwort erhalten Sie separat von Ihrem Ansprechpartner.</p>"
    : "";
  const passwordText = args.passwordProtected
    ? "Der Link ist passwortgeschützt. Das Passwort erhalten Sie separat von Ihrem Ansprechpartner.\n\n"
    : "";

  const subject = "Einladung zur AquaDock Standortanalyse";
  const html = `<p>${greeting}</p>
<p>bitte füllen Sie unsere Standortanalyse über den folgenden sicheren Link aus:</p>
<p><a href="${shareUrlHtml}">${shareUrlHtml}</a></p>
<p>Der Link ist gültig bis <strong>${escapeHtml(expiresLabel)}</strong>.</p>
${passwordHint}
<p>Vielen Dank.<br/>Ihr AquaDock Team</p>`;

  const text = `${greetingPlain}

bitte füllen Sie unsere Standortanalyse über den folgenden sicheren Link aus:

${args.shareUrl}

Der Link ist gültig bis ${expiresLabel}.

${passwordText}Vielen Dank.
Ihr AquaDock Team`;

  return { subject, html, text };
}
