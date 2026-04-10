"use client";

import { renderHook } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import type { AppLocale } from "@/lib/i18n/types";
import deMessages from "@/messages/de.json";
import { useNumberLocaleTag } from "./use-translations";

function wrapper(locale: AppLocale) {
  return function W({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider locale={locale} messages={deMessages}>
        {children}
      </NextIntlClientProvider>
    );
  };
}

describe("useNumberLocaleTag", () => {
  it("returns en-US for en", () => {
    const { result } = renderHook(() => useNumberLocaleTag(), { wrapper: wrapper("en") });
    expect(result.current).toBe("en-US");
  });

  it("returns hr-HR for hr", () => {
    const { result } = renderHook(() => useNumberLocaleTag(), { wrapper: wrapper("hr") });
    expect(result.current).toBe("hr-HR");
  });

  it("returns de-DE for de", () => {
    const { result } = renderHook(() => useNumberLocaleTag(), { wrapper: wrapper("de") });
    expect(result.current).toBe("de-DE");
  });
});
