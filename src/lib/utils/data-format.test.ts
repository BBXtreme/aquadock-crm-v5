/**
 * Tests for {@link ./data-format.ts} — `formatCurrency`, `formatDateDistance`, `safeDisplay`.
 * Note: `formatDateDE` and `emptyStringToNull` live in `@/lib/utils` and validation modules, not this file.
 */

import { afterEach, describe, expect, it, test, vi } from "vitest";
import { formatCurrency, formatDateDistance, safeDisplay } from "./data-format";

describe("formatCurrency", () => {
  it("prefixes Euro and uses German number formatting", () => {
    const formatted = (1234.56).toLocaleString("de-DE");
    expect(formatCurrency(1234.56)).toBe(`€${formatted}`);
  });

  test.each([
    ["null", null],
    ["undefined", undefined],
  ] as const)("treats %s as zero", (_label, input) => {
    const formatted = (0).toLocaleString("de-DE");
    expect(formatCurrency(input)).toBe(`€${formatted}`);
  });

  it("formats zero explicitly", () => {
    expect(formatCurrency(0)).toBe(`€${(0).toLocaleString("de-DE")}`);
  });

  it("formats negative amounts", () => {
    expect(formatCurrency(-99.5)).toBe(`€${(-99.5).toLocaleString("de-DE")}`);
  });
});

describe("formatDateDistance", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns em dash for null, undefined, and empty string", () => {
    expect(formatDateDistance(null)).toBe("—");
    expect(formatDateDistance(undefined)).toBe("—");
    expect(formatDateDistance("")).toBe("—");
  });

  it("returns a non-placeholder German relative string for a past ISO date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
    const result = formatDateDistance("2026-06-10T12:00:00.000Z");
    expect(result).not.toBe("—");
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns em dash when date-fns rejects the date (invalid / out-of-range)", () => {
    expect(formatDateDistance("invalid-date-value")).toBe("—");
  });
});

describe("safeDisplay", () => {
  it("uses default fallback for null and undefined", () => {
    expect(safeDisplay(null)).toBe("—");
    expect(safeDisplay(undefined)).toBe("—");
  });

  it("respects custom fallback", () => {
    expect(safeDisplay(null, "n/a")).toBe("n/a");
    expect(safeDisplay(undefined, "")).toBe("");
  });

  it("stringifies primitives including zero and false", () => {
    expect(safeDisplay(0)).toBe("0");
    expect(safeDisplay(false)).toBe("false");
    expect(safeDisplay(true)).toBe("true");
  });

  it("returns empty string for empty string input (value is not nullish)", () => {
    expect(safeDisplay("")).toBe("");
  });

  it("stringifies numbers and bigints", () => {
    expect(safeDisplay(42)).toBe("42");
    expect(safeDisplay(BigInt(7))).toBe("7");
  });
});
