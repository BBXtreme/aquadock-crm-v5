"use client";

import { useLayoutEffect } from "react";

import { LS_APPEARANCE_LOCALE } from "@/lib/constants/theme";
import { resolveAppLocale } from "@/lib/i18n/messages";
import { parseAppearanceLocale } from "@/lib/validations/appearance";

/**
 * Sets <html lang> from the appearance localStorage mirror before paint when possible.
 * Defaults to `de`. AppearanceHydration keeps the value aligned after remote load.
 */
export function RootDocumentLang() {
  useLayoutEffect(() => {
    const parsed = parseAppearanceLocale(localStorage.getItem(LS_APPEARANCE_LOCALE));
    document.documentElement.lang = resolveAppLocale(parsed ?? undefined);
  }, []);
  return null;
}
