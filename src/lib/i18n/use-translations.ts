"use client";

import { useLocale } from "next-intl";

import "@/lib/i18n/types";

export { useFormatter as useFormat, useTranslations as useT } from "next-intl";

/** BCP 47 tag for `Number#toLocaleString` / `Date#toLocaleDateString` aligned with app locale. */
export function useNumberLocaleTag(): string {
  const locale = useLocale();
  if (locale === "en") {
    return "en-US";
  }
  if (locale === "hr") {
    return "hr-HR";
  }
  return "de-DE";
}
