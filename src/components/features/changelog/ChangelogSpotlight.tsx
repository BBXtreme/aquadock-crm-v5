"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  CHANGELOG_LAST_SEEN_STORAGE_KEY,
  CHANGELOG_SEEN_EVENT,
  getLatestRelease,
} from "@/content/changelog";
import { compareSemver } from "@/lib/changelog/compare-semver";
import { useT } from "@/lib/i18n/use-translations";

function shouldShowSpotlight(appVersion: string, lastSeen: string | null): boolean {
  if (lastSeen === null || lastSeen === "") {
    return true;
  }
  const cmp = compareSemver(appVersion, lastSeen);
  if (cmp === null) {
    return true;
  }
  return cmp === 1;
}

export interface ChangelogSpotlightProps {
  appVersion: string;
}

export function ChangelogSpotlight({ appVersion }: ChangelogSpotlightProps) {
  const t = useT("changelog");
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  const latest = getLatestRelease();
  const spotlightChanges = latest.changes.slice(0, 6);

  useEffect(() => {
    let lastSeen: string | null = null;
    try {
      lastSeen = window.localStorage.getItem(CHANGELOG_LAST_SEEN_STORAGE_KEY);
    } catch {
      lastSeen = null;
    }
    if (shouldShowSpotlight(appVersion, lastSeen)) {
      setOpen(true);
    }
    setReady(true);
  }, [appVersion]);

  const persistDismiss = useCallback(() => {
    try {
      window.localStorage.setItem(CHANGELOG_LAST_SEEN_STORAGE_KEY, appVersion);
      window.dispatchEvent(new Event(CHANGELOG_SEEN_EVENT));
    } catch {
      /* private mode or quota */
    }
  }, [appVersion]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        persistDismiss();
      }
      setOpen(next);
    },
    [persistDismiss],
  );

  if (!ready) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 sm:max-w-md"
        aria-labelledby="changelog-spotlight-title"
      >
        <SheetHeader className="text-left">
          <SheetTitle id="changelog-spotlight-title">{t("spotlightTitle")}</SheetTitle>
          <SheetDescription className="text-base font-medium text-foreground">
            {latest.title}
          </SheetDescription>
        </SheetHeader>
        <ul className="flex-1 space-y-3 overflow-y-auto px-4 pb-4 pt-2 text-sm text-muted-foreground">
          {spotlightChanges.map((c) => (
            <li key={`${c.type}-${c.text.slice(0, 48)}`} className="leading-relaxed">
              {c.text}
            </li>
          ))}
        </ul>
        <SheetFooter className="flex-col gap-2 border-t border-border pt-4 sm:flex-col">
          <Button type="button" className="w-full" onClick={() => handleOpenChange(false)}>
            {t("spotlightDismiss")}
          </Button>
          <Button type="button" variant="outline" className="w-full" asChild>
            <Link href="/changelog" onClick={() => persistDismiss()}>
              {t("spotlightViewAll")}
            </Link>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
