import { describe, expect, it } from "vitest";
import { getMessagesForLocale, messageCatalog, resolveAppLocale } from "@/lib/i18n/messages";

describe("messages", () => {
  it("resolveAppLocale maps known locales and defaults to de", () => {
    expect(resolveAppLocale("en")).toBe("en");
    expect(resolveAppLocale("hr")).toBe("hr");
    expect(resolveAppLocale("de")).toBe("de");
    expect(resolveAppLocale(undefined)).toBe("de");
    expect(resolveAppLocale("fr")).toBe("de");
    expect(resolveAppLocale("")).toBe("de");
  });

  it("getMessagesForLocale returns catalog entry", () => {
    expect(getMessagesForLocale("de")).toBe(messageCatalog.de);
    expect(getMessagesForLocale("en")).toBe(messageCatalog.en);
    expect(getMessagesForLocale("hr")).toBe(messageCatalog.hr);
  });
});
