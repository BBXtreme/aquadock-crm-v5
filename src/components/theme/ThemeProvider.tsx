"use client";

/**
 * Appearance hydration + CSS variable application (primary / sidebar / ring / accent).
 * Root `ThemeProvider` stays in `app/layout.tsx` (next-themes); this module only
 * syncs locale, color tokens, and DB ↔ localStorage mirrors.
 */

import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { useEffect, useLayoutEffect, useRef } from "react";
import type { AppearanceColorSchemeId } from "@/lib/constants/theme";
import {
  APPEARANCE_COLOR_SCHEMES,
  DEFAULT_APPEARANCE_COLOR_SCHEME,
  LS_APPEARANCE_COLOR,
  LS_APPEARANCE_LOCALE,
  LS_APPEARANCE_THEME,
} from "@/lib/constants/theme";
import { DEFAULT_APPEARANCE, loadAppearanceSettings } from "@/lib/services/user-settings";
import type { AppearanceSettingsRecord } from "@/lib/validations/settings";
import { parseAppearanceColorScheme, parseAppearanceLocale } from "@/lib/validations/settings";

export function applyAppearanceColorTokens(schemeId: AppearanceColorSchemeId, isDark: boolean): void {
  const tokens = APPEARANCE_COLOR_SCHEMES[schemeId][isDark ? "dark" : "light"];
  const root = document.documentElement;
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value);
  }
}

export function appearanceResolvedIsDark(resolvedTheme: string | undefined): boolean {
  if (resolvedTheme === "dark") return true;
  if (resolvedTheme === "light") return false;
  return document.documentElement.classList.contains("dark");
}

export function persistAppearanceLocalMirror(record: AppearanceSettingsRecord): void {
  try {
    localStorage.setItem(LS_APPEARANCE_THEME, record.theme);
    localStorage.setItem(LS_APPEARANCE_LOCALE, record.locale);
    localStorage.setItem(LS_APPEARANCE_COLOR, record.colorScheme);
  } catch {
    // storage quota / private mode
  }
}

/** Apply `lang`, localStorage mirror, and color CSS variables (does not call `setTheme`). */
export function applyAppearanceDom(record: AppearanceSettingsRecord, resolvedTheme: string | undefined): void {
  document.documentElement.lang = record.locale;
  persistAppearanceLocalMirror(record);
  applyAppearanceColorTokens(record.colorScheme, appearanceResolvedIsDark(resolvedTheme));
}

function appearanceRecordKey(record: AppearanceSettingsRecord): string {
  return `${record.theme}|${record.locale}|${record.colorScheme}`;
}

function themeFromAppearanceKey(key: string): string | null {
  const i = key.indexOf("|");
  if (i <= 0) return null;
  return key.slice(0, i);
}

export function AppearanceHydration() {
  const { setTheme, resolvedTheme } = useTheme();
  const setThemeRef = useRef(setTheme);
  setThemeRef.current = setTheme;

  const schemeRef = useRef<AppearanceColorSchemeId>(DEFAULT_APPEARANCE_COLOR_SCHEME);
  const lastRemoteSyncKeyRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    const l = parseAppearanceLocale(localStorage.getItem(LS_APPEARANCE_LOCALE));
    const c = parseAppearanceColorScheme(localStorage.getItem(LS_APPEARANCE_COLOR));
    if (l) document.documentElement.lang = l;
    const scheme = c ?? DEFAULT_APPEARANCE_COLOR_SCHEME;
    schemeRef.current = scheme;
    applyAppearanceColorTokens(scheme, document.documentElement.classList.contains("dark"));
  }, []);

  const { data: remote } = useQuery({
    queryKey: ["appearance-settings"],
    queryFn: async () => {
      const loaded = await loadAppearanceSettings();
      return loaded ?? DEFAULT_APPEARANCE;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Keep palette ref aligned with React Query whenever `remote` updates (including new object
  // references from setQueryData). Do not derive palette from `remote` inside the light/dark effect:
  // that effect must only swap light/dark token sets for the *current* ref, never overwrite the ref
  // from possibly stale `remote?.colorScheme` during the same update as a header toggle.
  useEffect(() => {
    if (remote === undefined) return;
    schemeRef.current = remote.colorScheme;
  }, [remote]);

  useEffect(() => {
    if (remote === undefined) return;
    const key = appearanceRecordKey(remote);
    if (lastRemoteSyncKeyRef.current === key) return;

    const prevKey = lastRemoteSyncKeyRef.current;
    lastRemoteSyncKeyRef.current = key;

    const prevTheme = prevKey === null ? null : themeFromAppearanceKey(prevKey);
    const shouldApplyStoredTheme =
      prevKey === null || (prevTheme !== null && prevTheme !== remote.theme);

    persistAppearanceLocalMirror(remote);
    document.documentElement.lang = remote.locale;
    if (shouldApplyStoredTheme) {
      setThemeRef.current(remote.theme);
    }
    schemeRef.current = remote.colorScheme;
    applyAppearanceColorTokens(
      remote.colorScheme,
      document.documentElement.classList.contains("dark"),
    );
    // `setTheme(remote.theme)` only on first account appearance load (prevKey === null) or when
    // the user saved a new theme in Settings (theme segment of the record changed). Header toggles
    // do not update this query, so they stay independent for the rest of the session.
  }, [remote]);

  useEffect(() => {
    if (resolvedTheme === undefined) return;
    applyAppearanceColorTokens(schemeRef.current, resolvedTheme === "dark");
  }, [resolvedTheme]);

  return null;
}
