import { z } from "zod";
import { APPEARANCE_COLOR_SCHEME_IDS } from "@/lib/constants/theme";

export const appearanceThemeSchema = z.enum(["light", "dark", "system"]);

export type AppearanceTheme = z.infer<typeof appearanceThemeSchema>;

export const appearanceLocaleSchema = z.enum(["en", "de", "hr"]);

export type AppearanceLocale = z.infer<typeof appearanceLocaleSchema>;

export const appearanceColorSchemeSchema = z.enum(APPEARANCE_COLOR_SCHEME_IDS);

export type AppearanceColorScheme = z.infer<typeof appearanceColorSchemeSchema>;

export type AppearanceSettingsRecord = {
  theme: AppearanceTheme;
  locale: AppearanceLocale;
  colorScheme: AppearanceColorScheme;
};

export function parseAppearanceTheme(value: unknown): AppearanceTheme | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const result = appearanceThemeSchema.safeParse(value.trim());
  return result.success ? result.data : null;
}

export function parseAppearanceLocale(value: unknown): AppearanceLocale | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "fr") {
    return "de";
  }
  const result = appearanceLocaleSchema.safeParse(trimmed);
  return result.success ? result.data : null;
}

export function parseAppearanceColorScheme(value: unknown): AppearanceColorScheme | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const result = appearanceColorSchemeSchema.safeParse(value.trim());
  return result.success ? result.data : null;
}
