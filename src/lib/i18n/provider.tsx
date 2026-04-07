"use client";

import { useQuery } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import type React from "react";
import { useMemo } from "react";

import { DEFAULT_APPEARANCE, loadAppearanceSettings } from "@/lib/services/user-settings";

import { getMessagesForLocale, resolveAppLocale } from "./messages";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { data: appearanceRecord = DEFAULT_APPEARANCE } = useQuery({
    queryKey: ["appearance-settings"],
    queryFn: async () => {
      const loaded = await loadAppearanceSettings();
      return loaded ?? DEFAULT_APPEARANCE;
    },
    placeholderData: DEFAULT_APPEARANCE,
    staleTime: 5 * 60 * 1000,
  });

  const locale = resolveAppLocale(appearanceRecord.locale);
  const messages = useMemo(() => getMessagesForLocale(locale), [locale]);

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Europe/Berlin" now={new Date()}>
      {children}
    </NextIntlClientProvider>
  );
}
