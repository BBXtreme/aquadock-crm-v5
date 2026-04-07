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
        className="-ml-2 h-9 w-fit gap-2 px-2 text-muted-foreground hover:text-foreground"
        asChild
      >
        <Link href="/brevo">
          <ArrowLeft className="size-4 shrink-0" aria-hidden />
          {t("syncBack")}
        </Link>
      </Button>

      <header className="border-b pb-6">
        <p className="text-sm text-muted-foreground">{t("syncBreadcrumb")}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          {t("syncTitle")}
        </h1>
        <p className="mt-2 max-w-3xl text-muted-foreground leading-relaxed">{t("syncDescription")}</p>
      </header>
    </div>
  );
}
