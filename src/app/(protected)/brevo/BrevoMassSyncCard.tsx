"use client";

import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/lib/i18n/use-translations";

export function BrevoMassSyncCard({ children }: { children: ReactNode }) {
  const t = useT("brevo");

  return (
    <section aria-labelledby="brevo-mass-sync-heading">
      <Card className="shadow-sm transition-shadow dark:shadow-md dark:shadow-black/25 dark:ring-foreground/15">
        <CardHeader className="space-y-2 border-b border-border/50 pb-4">
          <CardTitle
            id="brevo-mass-sync-heading"
            className="text-xl font-semibold tracking-tight text-foreground"
          >
            {t("massSyncTitle")}
          </CardTitle>
          <CardDescription className="max-w-2xl text-base leading-relaxed">
            {t("massSyncDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6 pt-6">{children}</CardContent>
      </Card>
    </section>
  );
}
