export function BrevoRecipientIntro() {
  return (
    <p className="text-sm text-muted-foreground">
      Filter gelten nur für diese Empfängertabelle (Kampagne). Massen-Sync zu Brevo:{" "}
      <span className="font-medium text-foreground">Brevo → Kontakte abgleichen</span> (
      <span className="font-mono text-foreground">/brevo/sync</span>).
    </p>
  );
}
