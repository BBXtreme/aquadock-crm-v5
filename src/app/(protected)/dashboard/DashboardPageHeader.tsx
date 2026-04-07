"use client";

import { useT } from "@/lib/i18n/use-translations";
import { safeDisplay } from "@/lib/utils/data-format";

export function DashboardPageHeader({ displayName }: { displayName: string | null | undefined }) {
  const t = useT("dashboard");

  return (
    <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <div className="text-sm text-muted-foreground">{t("breadcrumb")}</div>
        <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          {t("title")}
        </h1>
        <p className="text-muted-foreground">
          {t.rich("welcome", {
            name: safeDisplay(displayName),
            userName: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
          })}
        </p>
      </div>
    </div>
  );
}
