"use client";

import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/lib/i18n/use-translations";

export function BrevoMassSyncCard({ children }: { children: ReactNode }) {
  const t = useT("brevo");

  return (
    <section aria-labelledby="brevo-mass-sync-heading">
      <Card className="border-border rounded-xl shadow-sm">
        <CardHeader className="space-y-2 pb-2">
          <CardTitle id="brevo-mass-sync-heading" className="text-xl font-semibold tracking-tight">
            {t("massSyncTitle")}
          </CardTitle>
          <CardDescription className="max-w-2xl text-base leading-relaxed">{t("massSyncDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 pb-6">{children}</CardContent>
      </Card>
    </section>
  );
}
