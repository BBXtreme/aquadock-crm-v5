import { describe, expect, it, vi } from "vitest";
import {
  cn,
  formatDateDE,
  getCountryFlag,
  getFirmentypLabel,
  getKundentypLabel,
  getPriorityLabel,
  getReminderStatusLabel,
  getStatusLabel,
  safeDisplay,
} from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("resolves tailwind conflicts", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});

describe("getKundentypLabel", () => {
  it("maps known keys case-insensitively", () => {
    expect(getKundentypLabel("MARINA")).toBe("⚓ Marina");
  });

  it("returns raw value when unknown", () => {
    expect(getKundentypLabel("unknown_xyz")).toBe("unknown_xyz");
  });
});

describe("getStatusLabel", () => {
  it("maps known status", () => {
    expect(getStatusLabel("LEAD")).toBe("🔍 Lead");
  });

  it("returns raw when unknown", () => {
    expect(getStatusLabel("custom")).toBe("custom");
  });
});

describe("getFirmentypLabel", () => {
  it("maps known firmentyp", () => {
    expect(getFirmentypLabel("KETTE")).toBe("🏢 Kette");
  });

  it("returns raw when unknown", () => {
    expect(getFirmentypLabel("x")).toBe("x");
  });
});

describe("getCountryFlag", () => {
  it("returns null for null country", () => {
    expect(getCountryFlag(null)).toBeNull();
  });

  it("returns fallback flag for unknown code", () => {
    expect(getCountryFlag("ZZ")).toBe("🏳️");
  });
});

describe("getPriorityLabel", () => {
  it("maps known priority", () => {
    expect(getPriorityLabel("hoch")).toBeTruthy();
  });

  it("returns em dash for empty", () => {
    expect(getPriorityLabel(null)).toBe("—");
  });
});

describe("getReminderStatusLabel", () => {
  it("maps known status", () => {
    expect(getReminderStatusLabel("open")).toBe("Offen");
  });

  it("returns em dash for empty", () => {
    expect(getReminderStatusLabel(undefined)).toBe("—");
  });
});

describe("formatDateDE", () => {
  it("returns em dash for nullish", () => {
    expect(formatDateDE(null)).toBe("—");
    expect(formatDateDE(undefined)).toBe("—");
  });

  it("formats ISO date in de-DE", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
    const out = formatDateDE("2026-04-10");
    expect(out).toMatch(/\d{2}\.\d{2}\.\d{4}/);
    vi.useRealTimers();
  });
});

describe("safeDisplay", () => {
  it("returns em dash for nullish", () => {
    expect(safeDisplay(null)).toBe("—");
    expect(safeDisplay(undefined)).toBe("—");
  });

  it("stringifies other values", () => {
    expect(safeDisplay(42)).toBe("42");
  });
});
