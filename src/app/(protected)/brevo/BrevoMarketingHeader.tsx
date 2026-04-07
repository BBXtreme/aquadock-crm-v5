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
        <p className="text-sm text-muted-foreground">{t("pageBreadcrumb")}</p>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          {t("pageTitle")}
        </h1>
        <p className="max-w-2xl text-muted-foreground leading-relaxed">
          {t("pageDescription")}{" "}
          <Link href="/brevo/sync" className="font-medium text-foreground underline-offset-4 hover:underline">
            {t("pageDescriptionHighlight")}
          </Link>
          .
        </p>
      </div>
      <Button variant="outline" size="default" className="h-10 shrink-0 gap-2 self-stretch sm:self-start" asChild>
        <Link href="/brevo/sync">
          <Users className="h-4 w-4" aria-hidden />
          {t("syncButton")}
        </Link>
      </Button>
    </header>
  );
}
