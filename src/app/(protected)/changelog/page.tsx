import type { LucideIcon } from "lucide-react";
import { PlusCircle, Shield, Wrench, Zap } from "lucide-react";
import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { Separator } from "@/components/ui/separator";
import { type ChangelogRelease, getChangelogEntriesSorted } from "@/content/changelog";
import { getMessagesForLocale, resolveAppLocale } from "@/lib/i18n/messages";
import type { AppLocale } from "@/lib/i18n/types";

const TYPE_ICONS = {
  feature: PlusCircle,
  improvement: Zap,
  fix: Wrench,
  security: Shield,
} satisfies Record<ChangelogRelease["changes"][number]["type"], LucideIcon>;

function formatReleasedDateDisplay(iso: string, locale: AppLocale): string {
  const parts = iso.split("-").map((x) => Number.parseInt(x, 10));
  const y = parts[0];
  const mo = parts[1];
  const d = parts[2];
  if (
    y === undefined ||
    mo === undefined ||
    d === undefined ||
    Number.isNaN(y) ||
    Number.isNaN(mo) ||
    Number.isNaN(d)
  ) {
    return iso;
  }
  const dt = new Date(y, mo - 1, d);
  const tag = locale === "en" ? "en-US" : locale === "hr" ? "hr-HR" : "de-DE";
  return dt.toLocaleDateString(tag, { day: "numeric", month: "long", year: "numeric" });
}

export async function generateMetadata(): Promise<Metadata> {
  const c = getMessagesForLocale(resolveAppLocale(undefined)).changelog;
  return {
    title: c.pageTitle,
    description: c.metaDescription,
  };
}

export default function ChangelogPage() {
  const locale = resolveAppLocale(undefined);
  const c = getMessagesForLocale(locale).changelog;
  const entries = getChangelogEntriesSorted();

  const typeLabel = (type: ChangelogRelease["changes"][number]["type"]): string => {
    switch (type) {
      case "feature":
        return c.typeFeature;
      case "improvement":
        return c.typeImprovement;
      case "fix":
        return c.typeFix;
      case "security":
        return c.typeSecurity;
    }
  };

  return (
    <PageShell>
      <header className="mx-auto max-w-3xl space-y-2.5 pb-10 md:pb-12">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground md:text-[2rem] md:leading-tight">
          {c.pageTitle}
        </h1>
        <p className="text-muted-foreground text-base leading-relaxed md:text-lg">{c.pageSubtitle}</p>
      </header>

      <div className="mx-auto max-w-3xl">
        {entries.map((release, index) => (
          <section
            key={release.version}
            className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-5 pb-16 last:pb-0 md:grid-cols-[1.5rem_minmax(0,1fr)] md:gap-x-8 md:pb-18"
          >
            <div className="relative flex justify-center pt-0.5">
              {index < entries.length - 1 ? (
                <div
                  className="absolute top-3.5 bottom-0 left-1/2 w-px -translate-x-1/2 bg-linear-to-b from-border to-border/25"
                  aria-hidden
                />
              ) : null}
              <span
                className="relative z-1 mt-1 size-2.5 shrink-0 rounded-full border-2 border-background bg-primary shadow-sm ring-[3px] ring-primary/15"
                aria-hidden
              />
            </div>

            <div className="min-w-0">
              <header className="space-y-2 pb-1">
                <time
                  dateTime={release.releasedAt}
                  className="block text-muted-foreground text-sm font-medium leading-snug tracking-wide"
                >
                  {c.releasedOn.replace("{date}", formatReleasedDateDisplay(release.releasedAt, locale))}
                </time>
                <h2 className="font-heading text-xl font-semibold leading-snug tracking-tight text-foreground md:text-[1.35rem]">
                  {release.title}
                </h2>
                <p className="text-muted-foreground/80 text-xs tabular-nums tracking-wide">v{release.version}</p>
              </header>

              <Card className="mt-6 border-border/60 shadow-sm md:mt-7">
                <CardContent className="space-y-0 px-4 py-5 sm:px-5 sm:py-6 md:px-6">
                  {release.changes.map((change, changeIndex) => {
                    const Icon = TYPE_ICONS[change.type];
                    return (
                      <div key={`${release.version}-${change.type}-${change.text}`}>
                        {changeIndex > 0 ? <Separator className="my-5" /> : null}
                        <div className="flex gap-3.5 sm:gap-4">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Icon className="size-4 shrink-0" aria-hidden />
                          </div>
                          <div className="min-w-0 space-y-1.5 pt-0.5">
                            <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                              {typeLabel(change.type)}
                            </p>
                            <p className="text-foreground text-sm leading-relaxed">{change.text}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
