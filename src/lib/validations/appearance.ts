import { z } from "zod";
import { APPEARANCE_COLOR_SCHEME_IDS } from "@/lib/constants/theme";

export const appearanceThemeSchema = z.enum(["light", "dark", "system"]);

export type AppearanceTheme = z.infer<typeof appearanceThemeSchema>;

export const appearanceLocaleSchema = z.enum(["en", "de", "hr"]);

export type AppearanceLocale = z.infer<typeof appearanceLocaleSchema>;

export const appearanceColorSchemeSchema = z.enum(APPEARANCE_COLOR_SCHEME_IDS);

export type AppearanceColorScheme = z.infer<typeof appearanceColorSchemeSchema>;

export function isValidIanaTimeZone(id: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: id }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export const appearanceTimeZoneSchema = z
  .string()
  .trim()
  .min(1, { message: "Ungültige Zeitzone." })
  .refine(isValidIanaTimeZone, { message: "Unbekannte IANA-Zeitzone." });

export type AppearanceTimeZone = z.infer<typeof appearanceTimeZoneSchema>;

export type AppearanceSettingsRecord = {
  theme: AppearanceTheme;
  locale: AppearanceLocale;
  colorScheme: AppearanceColorScheme;
  timeZone: string;
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

export function parseAppearanceTimeZone(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const result = appearanceTimeZoneSchema.safeParse(value.trim());
  return result.success ? result.data : null;
}
