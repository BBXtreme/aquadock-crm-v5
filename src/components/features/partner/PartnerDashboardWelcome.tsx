// src/components/features/partner/PartnerDashboardWelcome.tsx
//
// Welcome card shown on `/partner/dashboard`. Pure presentational — the real
// partner KPIs land in v5.1.

"use client";

import { ArrowUpRight, Compass, LifeBuoy, Paintbrush } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useT } from "@/lib/i18n/use-translations";

interface PartnerDashboardWelcomeProps {
  displayName: string;
}

export function PartnerDashboardWelcome({
  displayName,
}: PartnerDashboardWelcomeProps) {
  const t = useT("partnerDashboard");
  const cards = [
    {
      icon: Compass,
      title: t("cards.bookings.title"),
      body: t("cards.bookings.body"),
    },
    {
      icon: Paintbrush,
      title: t("cards.materials.title"),
      body: t("cards.materials.body"),
    },
    {
      icon: LifeBuoy,
      title: t("cards.support.title"),
      body: t("cards.support.body"),
    },
  ] as const;

  return (
    <div className="space-y-8">
      <header className="space-y-3 border-b border-border/40 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          {t("eyebrow")}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("titleWithName", { name: displayName })}
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          {t("subtitle")}
        </p>
      </header>

      <section
        className="grid gap-4 sm:grid-cols-3"
        aria-label={t("cards.ariaLabel")}
      >
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <span
                aria-hidden
                className="mb-1 grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary"
              >
                <card.icon className="size-5" />
              </span>
              <CardTitle>{card.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="leading-relaxed">
                {card.body}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{t("comingSoon.title")}</CardTitle>
          <CardDescription className="max-w-2xl leading-relaxed">
            {t("comingSoon.body")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a
            href="https://aquadock.de/kontakt"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 transition-colors hover:underline"
          >
            {t("comingSoon.contactCta")}
            <ArrowUpRight className="size-4" aria-hidden />
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
