import type de from "@/messages/de.json";

export type AppLocale = "de" | "en" | "hr";

declare module "next-intl" {
  interface AppConfig {
    Locale: AppLocale;
    Messages: typeof de;
  }
}
