"use client";

import { Users } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/use-translations";

export function BrevoMarketingHeader() {
  const t = useT("brevo");

  return (
    <header className="flex flex-col gap-6 border-b border-border/60 pb-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1 space-y-2">
        <nav aria-label={t("pageBreadcrumb")}>
          <p className="text-sm leading-normal text-muted-foreground">{t("pageBreadcrumb")}</p>
        </nav>
        <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          {t("pageTitle")}
        </h1>
        <p className="max-w-2xl leading-relaxed text-muted-foreground">
          {t("pageDescription")}{" "}
          <Link
            href="/brevo/sync"
            className="font-medium text-primary underline-offset-4 transition-colors hover:text-primary/90 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {t("pageDescriptionHighlight")}
          </Link>
          .
        </p>
      </div>
      <Button
        variant="outline"
        size="default"
        className="h-10 shrink-0 gap-2 self-stretch border-border/80 bg-background/80 shadow-sm transition-[box-shadow,background-color] hover:bg-accent/50 hover:shadow-md dark:bg-background/40 dark:hover:bg-accent/30 sm:self-start"
        asChild
      >
        <Link href="/brevo/sync">
          <Users className="h-4 w-4 shrink-0" aria-hidden />
          {t("syncButton")}
        </Link>
      </Button>
    </header>
  );
}
