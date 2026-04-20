"use client";

import { useT } from "@/lib/i18n/use-translations";

export function BrevoRecipientIntro() {
  const t = useT("brevo");
  return (
    <p className="text-sm text-muted-foreground">
      {t("recipientIntro")}{" "}
      <span className="font-medium text-foreground">{t("recipientIntroLinkLabel")}</span> (
      <span className="font-mono text-foreground">/brevo/sync</span>).
    </p>
  );
}
