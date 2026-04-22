import { afterEach, describe, expect, it, vi } from "vitest";
import * as appearanceValidations from "@/lib/validations/appearance";
import { getDefaultAppearanceTimeZone } from "./appearance-timezone-default";

describe("getDefaultAppearanceTimeZone", () => {
  const originalIntl = globalThis.Intl;

  afterEach(() => {
    globalThis.Intl = originalIntl;
    vi.restoreAllMocks();
  });

  it("returns UTC when Intl is missing", () => {
    // @ts-expect-error — simulate environments without Intl
    delete globalThis.Intl;
    expect(getDefaultAppearanceTimeZone()).toBe("UTC");
  });

  it("returns UTC when DateTimeFormat is missing", () => {
    globalThis.Intl = { ...originalIntl, DateTimeFormat: undefined } as unknown as typeof Intl;
    expect(getDefaultAppearanceTimeZone()).toBe("UTC");
  });

  it("returns resolved time zone when valid", () => {
    vi.spyOn(appearanceValidations, "isValidIanaTimeZone").mockReturnValue(true);
    vi.spyOn(Intl, "DateTimeFormat").mockImplementation(
      () =>
        ({
          resolvedOptions: () => ({ timeZone: "Europe/Berlin" }),
        }) as unknown as Intl.DateTimeFormat,
    );
    expect(getDefaultAppearanceTimeZone()).toBe("Europe/Berlin");
  });

  it("returns UTC when resolved zone is invalid", () => {
    vi.spyOn(Intl, "DateTimeFormat").mockImplementation((...args: unknown[]) => {
      const options = args[1] as { timeZone?: string } | undefined;
      if (options?.timeZone != null) {
        return {
          format: () => {
            throw new RangeError("invalid time zone");
          },
        } as unknown as Intl.DateTimeFormat;
      }
      return {
        resolvedOptions: () => ({ timeZone: "not-a-real-zone" }),
      } as unknown as Intl.DateTimeFormat;
    });
    expect(getDefaultAppearanceTimeZone()).toBe("UTC");
  });

  it("returns UTC when resolvedOptions throws", () => {
    vi.spyOn(Intl, "DateTimeFormat").mockImplementation(
      () =>
        ({
          resolvedOptions: () => {
            throw new Error("boom");
          },
        }) as unknown as Intl.DateTimeFormat,
    );
    expect(getDefaultAppearanceTimeZone()).toBe("UTC");
  });
});
