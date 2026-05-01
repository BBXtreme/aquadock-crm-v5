// src/app/(protected)/settings/SettingsPageHeader.tsx
// This file contains the SettingsPageHeader component, which displays the header for the settings page.
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/use-translations";
import { safeDisplay } from "@/lib/utils/data-format";

export function SettingsPageHeader({ displayName }: { displayName: string | null | undefined }) {
  const t = useT("settings");
  const tChangelog = useT("changelog");

  return (
    <div className="flex flex-col gap-4 border-b border-border/40 pb-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          {t("pageTitle")}
        </h1>
        <p className="text-muted-foreground">{t("pageSubtitle")}</p>
      </div>

      <div className="flex flex-col gap-2 sm:items-end">
        <div className="text-muted-foreground sm:text-right">
          {t.rich("pageWelcomeRich", {
            name: safeDisplay(displayName),
            userName: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
          })}
        </div>
        <Button variant="outline" size="sm" asChild className="w-fit sm:self-end">
          <Link href="/changelog">{tChangelog("settingsLink")}</Link>
        </Button>
      </div>
    </div>
  );
}
