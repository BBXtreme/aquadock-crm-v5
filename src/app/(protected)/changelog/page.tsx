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
      <div className="mx-auto max-w-3xl space-y-2 pb-8">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          {c.pageTitle}
        </h1>
        <p className="text-muted-foreground text-lg">{c.pageSubtitle}</p>
      </div>

      <div className="mx-auto max-w-3xl">
        {entries.map((release, index) => (
          <section
            key={release.version}
            className="flex items-stretch gap-5 md:gap-8"
          >
            <div className="flex w-5 shrink-0 flex-col items-center self-stretch md:w-6">
              <div
                className="mt-2 size-3.5 rounded-full border-2 border-background bg-primary shadow-sm ring-4 ring-primary/15 md:size-4"
                aria-hidden
              />
              {index < entries.length - 1 ? (
                <div
                  className="mt-5 w-px min-h-0 flex-1 bg-border"
                  aria-hidden
                />
              ) : null}
            </div>

            <div
              className={`min-w-0 flex-1 space-y-5 md:space-y-6 ${index < entries.length - 1 ? "pb-20 md:pb-28" : ""}`}
            >
              <div className="space-y-1.5">
                <p className="text-muted-foreground text-sm font-medium leading-snug">
                  {c.releasedOn.replace("{date}", formatReleasedDateDisplay(release.releasedAt, locale))}
                </p>
                <h2 className="font-heading text-xl font-semibold leading-snug text-foreground">
                  {release.title}
                </h2>
                <p className="text-muted-foreground text-xs tabular-nums">v{release.version}</p>
              </div>

              <Card className="shadow-sm">
                <CardContent className="space-y-4 pt-6 md:pt-7">
                  {release.changes.map((change, changeIndex) => {
                    const Icon = TYPE_ICONS[change.type];
                    return (
                      <div key={`${release.version}-${change.type}-${change.text}`}>
                        {changeIndex > 0 ? <Separator className="mb-4" /> : null}
                        <div className="flex gap-3">
                          <Icon
                            className="mt-0.5 size-5 shrink-0 text-primary"
                            aria-hidden
                          />
                          <div className="min-w-0 space-y-1">
                            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
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
