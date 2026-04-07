// src/components/layout/RootDocumentLang.tsx
// This file contains the RootDocumentLang component, which keeps the <html lang> attribute in sync with the appearance locale. This is used to ensure that the language of the page is always the same as the appearance locale. 

"use client";

import { useLayoutEffect } from "react";

import { LS_APPEARANCE_LOCALE } from "@/lib/constants/theme";
import { resolveAppLocale } from "@/lib/i18n/messages";
import { parseAppearanceLocale } from "@/lib/validations/appearance";

/**
 * Keeps `<html lang>` aligned with the appearance locale mirror after React commits.
 * `app/layout.tsx` injects a `beforeInteractive` script that sets `lang` earlier (before first paint);
 * this effect covers hydration and stays consistent with `parseAppearanceLocale` / `resolveAppLocale` (en, de, hr; fr → de).
 */
export function RootDocumentLang() {
  useLayoutEffect(() => {
    const parsed = parseAppearanceLocale(localStorage.getItem(LS_APPEARANCE_LOCALE));
    document.documentElement.lang = resolveAppLocale(parsed ?? undefined);
  }, []);
  return null;
}
