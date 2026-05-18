import { afterEach, describe, expect, it, vi } from "vitest";

import { getStandortLandOptions } from "@/lib/standortanalyse/countries";

describe("getStandortLandOptions", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns sorted options with DE present when Intl works", () => {
    const options = getStandortLandOptions("de");
    expect(options.length).toBeGreaterThan(0);
    expect(options.some((option) => option.value === "DE")).toBe(true);

    const labels = options.map((option) => option.label);
    const sorted = [...labels].sort((a, b) => a.localeCompare(b));
    expect(labels).toEqual(sorted);
  });

  it("uses fallback region list when supportedValuesOf is missing", () => {
    vi.stubGlobal("Intl", {
      DisplayNames: Intl.DisplayNames,
    });

    const options = getStandortLandOptions("de");
    expect(options.map((option) => option.value)).toContain("DE");
    expect(options.map((option) => option.value)).toContain("CH");
    expect(options.length).toBe(28);
  });

  it("uses fallback when supportedValuesOf throws", () => {
    const supportedValuesOf = vi.fn(() => {
      throw new Error("unsupported");
    });
    vi.stubGlobal("Intl", {
      ...Intl,
      supportedValuesOf,
      DisplayNames: Intl.DisplayNames,
    });

    const options = getStandortLandOptions("de");
    expect(supportedValuesOf).toHaveBeenCalledWith("region");
    expect(options.length).toBe(28);
    expect(options.map((option) => option.value)).toContain("DE");
  });

  it("uses fallback when supportedValuesOf returns no valid ISO-2 codes", () => {
    vi.stubGlobal("Intl", {
      ...Intl,
      supportedValuesOf: vi.fn(() => ["INVALID", "1234"]),
      DisplayNames: Intl.DisplayNames,
    });

    const options = getStandortLandOptions("de");
    expect(options.length).toBe(28);
  });

  it("returns code as label when DisplayNames fails for a code", () => {
    vi.stubGlobal("Intl", {
      supportedValuesOf: () => ["ZZ"],
      DisplayNames: class {
        of() {
          throw new Error("locale unsupported");
        }
      },
    });

    const options = getStandortLandOptions("de");
    expect(options).toEqual([{ value: "ZZ", label: "ZZ" }]);
  });
});
