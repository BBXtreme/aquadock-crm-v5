// src/app/(protected)/settings/SettingsPageHeader.tsx
// This file contains the SettingsPageHeader component, which displays the header for the settings page.
"use client";

import { useT } from "@/lib/i18n/use-translations";
import { safeDisplay } from "@/lib/utils/data-format";

export function SettingsPageHeader({ displayName }: { displayName: string | null | undefined }) {
  const t = useT("settings");

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          {t("pageTitle")}
        </h1>
        <p className="text-muted-foreground">{t("pageSubtitle")}</p>
      </div>

      <div className="text-muted-foreground">
        {t.rich("pageWelcomeRich", {
          name: safeDisplay(displayName),
          userName: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
        })}
      </div>
    </>
  );
}
