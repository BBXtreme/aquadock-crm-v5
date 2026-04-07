"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/use-translations";

export function BrevoSyncPageHeader() {
  const t = useT("brevo");

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 h-9 w-fit gap-2 px-2 text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        asChild
      >
        <Link href="/brevo">
          <ArrowLeft className="size-4 shrink-0" aria-hidden />
          {t("syncBack")}
        </Link>
      </Button>

      <header className="border-b border-border/60 pb-6">
        <nav aria-label={t("syncBreadcrumb")}>
          <p className="text-sm leading-normal text-muted-foreground">{t("syncBreadcrumb")}</p>
        </nav>
        <h1 className="mt-2 text-3xl font-bold tracking-tight bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          {t("syncTitle")}
        </h1>
        <p className="mt-2 max-w-3xl leading-relaxed text-muted-foreground">{t("syncDescription")}</p>
      </header>
    </div>
  );
}
