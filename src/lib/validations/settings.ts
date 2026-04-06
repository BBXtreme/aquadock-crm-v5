import { z } from "zod";
import { APPEARANCE_COLOR_SCHEME_IDS } from "@/lib/constants/theme";

export const appearanceThemeSchema = z.enum(["light", "dark", "system"]);

export const appearanceLocaleSchema = z.enum(["en", "de"]);

export const appearanceColorSchemeSchema = z.enum(APPEARANCE_COLOR_SCHEME_IDS);

export const appearanceSettingsRecordSchema = z
  .object({
    theme: appearanceThemeSchema,
    locale: appearanceLocaleSchema,
    colorScheme: appearanceColorSchemeSchema,
  })
  .strict();

export type AppearanceTheme = z.infer<typeof appearanceThemeSchema>;
export type AppearanceLocale = z.infer<typeof appearanceLocaleSchema>;
export type AppearanceColorScheme = z.infer<typeof appearanceColorSchemeSchema>;
export type AppearanceSettingsRecord = z.infer<typeof appearanceSettingsRecordSchema>;

export function parseAppearanceTheme(value: unknown): AppearanceTheme | null {
  const r = appearanceThemeSchema.safeParse(value);
  return r.success ? r.data : null;
}

export function parseAppearanceLocale(value: unknown): AppearanceLocale | null {
  const r = appearanceLocaleSchema.safeParse(value);
  return r.success ? r.data : null;
}

export function parseAppearanceColorScheme(value: unknown): AppearanceColorScheme | null {
  const r = appearanceColorSchemeSchema.safeParse(value);
  return r.success ? r.data : null;
}
