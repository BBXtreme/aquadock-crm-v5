import de from "@/messages/de.json";
import en from "@/messages/en.json";
import hr from "@/messages/hr.json";

import type { AppLocale } from "./types";

export const messageCatalog: Record<AppLocale, typeof de> = {
  de,
  en,
  hr,
};

export function resolveAppLocale(raw: string | undefined): AppLocale {
  if (raw === "en") {
    return "en";
  }
  if (raw === "hr") {
    return "hr";
  }
  return "de";
}

export function getMessagesForLocale(locale: AppLocale): typeof de {
  return messageCatalog[locale];
}
