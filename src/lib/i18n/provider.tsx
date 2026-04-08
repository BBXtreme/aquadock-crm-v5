"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import type React from "react";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";

import { getDefaultAppearanceTimeZone } from "@/lib/constants/appearance-timezone-default";
import { LS_APPEARANCE_LOCALE, LS_APPEARANCE_TIMEZONE } from "@/lib/constants/theme";
import { DEFAULT_APPEARANCE, loadAppearanceSettings } from "@/lib/services/user-settings";
import { parseAppearanceLocale, parseAppearanceTimeZone } from "@/lib/validations/appearance";

import { getMessagesForLocale, resolveAppLocale } from "./messages";

const APPEARANCE_QUERY_KEY = ["appearance-settings"] as const;

/**
 * Same key and parsing as `RootDocumentLang` / ThemeProvider mirror.
 * Server / first paint: default record (matches SSR). Client after layout: localStorage.
 */
function appearanceFromLocalStorageOrDefault(): typeof DEFAULT_APPEARANCE {
  if (typeof window === "undefined") {
    return DEFAULT_APPEARANCE;
  }
  let rec: typeof DEFAULT_APPEARANCE = { ...DEFAULT_APPEARANCE };
  const locale = parseAppearanceLocale(localStorage.getItem(LS_APPEARANCE_LOCALE));
  if (locale) {
    rec = { ...rec, locale };
  }
  const tz = parseAppearanceTimeZone(localStorage.getItem(LS_APPEARANCE_TIMEZONE));
  if (tz) {
    rec = { ...rec, timeZone: tz };
  } else {
    rec = { ...rec, timeZone: getDefaultAppearanceTimeZone() };
  }
  return rec;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [syncAppearance, setSyncAppearance] = useState(() => DEFAULT_APPEARANCE);
  /** Stable clock for next-intl — avoid `new Date()` each render (re-renders subtree). */
  const [now] = useState(() => new Date());

  useLayoutEffect(() => {
    const fromStorage = appearanceFromLocalStorageOrDefault();
    setSyncAppearance((prev) =>
      prev.locale === fromStorage.locale &&
      prev.theme === fromStorage.theme &&
      prev.colorScheme === fromStorage.colorScheme &&
      prev.timeZone === fromStorage.timeZone
        ? prev
        : fromStorage,
    );
  }, []);

  // Seed shared cache after commit: setQueryData during useLayoutEffect notifies observers in layout
  // and can trigger React 19 "state update on component that hasn't mounted yet".
  useEffect(() => {
    const fromStorage = appearanceFromLocalStorageOrDefault();
    queryClient.setQueryData(APPEARANCE_QUERY_KEY, fromStorage);
  }, [queryClient]);

  const { data: appearanceRecord = syncAppearance } = useQuery({
    queryKey: APPEARANCE_QUERY_KEY,
    queryFn: async () => {
      const loaded = await loadAppearanceSettings();
      return loaded ?? DEFAULT_APPEARANCE;
    },
    placeholderData: syncAppearance,
    staleTime: 5 * 60 * 1000,
  });

  const locale = resolveAppLocale(appearanceRecord.locale);
  const messages = useMemo(() => getMessagesForLocale(locale), [locale]);

  // #region agent log
  useEffect(() => {
    const sb = messages.layout?.sidebar;
    fetch("http://127.0.0.1:7811/ingest/4f661c1b-aa49-4778-8f27-b8a02ff82f19", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "2fbdf8" },
      body: JSON.stringify({
        sessionId: "2fbdf8",
        location: "I18nProvider.tsx:messages",
        message: "I18n messages sidebar subtree",
        data: {
          locale,
          hasLayoutSidebar: Boolean(sb),
          sidebarKeyCount: sb && typeof sb === "object" ? Object.keys(sb).length : 0,
        },
        timestamp: Date.now(),
        hypothesisId: "H2",
      }),
    }).catch(() => {
      /* debug ingest optional */
    });
  }, [locale, messages]);
  // #endregion

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone={appearanceRecord.timeZone}
      now={now}
    >
      {children}
    </NextIntlClientProvider>
  );
}
