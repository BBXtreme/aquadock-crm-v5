import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildCompanyLandSelectOptions,
  DEFAULT_COMPANY_LAND_CODES,
  getLandFlagEmoji,
  getLandRegionDisplayName,
  isIso3166Alpha2,
  LAND_SELECT_CLEAR_SENTINEL,
  normalizeLandInput,
} from "./iso-land";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("normalizeLandInput", () => {
  it("rejects null, undefined, and whitespace-only input", () => {
    expect(normalizeLandInput(null)).toEqual({ ok: false });
    expect(normalizeLandInput(undefined)).toEqual({ ok: false });
    expect(normalizeLandInput("")).toEqual({ ok: false });
    expect(normalizeLandInput("   \t")).toEqual({ ok: false });
  });

  it("accepts valid ISO alpha-2 via compact letters path", () => {
    expect(normalizeLandInput("de")).toEqual({ ok: true, code: "DE" });
    expect(normalizeLandInput("DE")).toEqual({ ok: true, code: "DE" });
    expect(normalizeLandInput(" d e ")).toEqual({ ok: true, code: "DE" });
  });

  it("accepts known synonym labels", () => {
    expect(normalizeLandInput("Deutschland")).toEqual({ ok: true, code: "DE" });
    expect(normalizeLandInput("  deutschland  ")).toEqual({ ok: true, code: "DE" });
    expect(normalizeLandInput("United Kingdom")).toEqual({ ok: true, code: "GB" });
  });

  it("rejects unknown free text and invalid two-letter codes", () => {
    expect(normalizeLandInput("Atlantis")).toEqual({ ok: false });
    expect(normalizeLandInput("QQ")).toEqual({ ok: false });
    expect(normalizeLandInput("XYZ")).toEqual({ ok: false });
  });
});

describe("getLandRegionDisplayName", () => {
  it("returns empty string for missing code", () => {
    expect(getLandRegionDisplayName("", "de")).toBe("");
    expect(getLandRegionDisplayName("   ", "de")).toBe("");
  });

  it("returns trimmed input when not ISO alpha-2 shape", () => {
    expect(getLandRegionDisplayName("  atlantis ", "de")).toBe("atlantis");
    expect(getLandRegionDisplayName("D", "de")).toBe("D");
    expect(getLandRegionDisplayName("DEE", "de")).toBe("DEE");
  });

  it("returns localized label for assigned regions when Intl succeeds", () => {
    const label = getLandRegionDisplayName("DE", "de");
    expect(label.length).toBeGreaterThan(0);
    expect(label).not.toBe("DE");
  });

  it("falls back to uppercase code when DisplayNames throws", () => {
    vi.spyOn(Intl, "DisplayNames").mockImplementation(function displayNamesThrows() {
      throw new Error("boom");
    } as unknown as typeof Intl.DisplayNames);
    expect(getLandRegionDisplayName("DE", "de")).toBe("DE");
  });

  it("falls back to uppercase when of() returns undefined", () => {
    const spy = vi.spyOn(Intl.DisplayNames.prototype, "of").mockReturnValue(undefined);
    expect(getLandRegionDisplayName("DE", "de")).toBe("DE");
    spy.mockRestore();
  });

  it("falls back to uppercase when of() returns the code unchanged", () => {
    const spy = vi.spyOn(Intl.DisplayNames.prototype, "of").mockReturnValue("DE");
    expect(getLandRegionDisplayName("DE", "de")).toBe("DE");
    spy.mockRestore();
  });
});

describe("isIso3166Alpha2", () => {
  it("matches assigned regions", () => {
    expect(isIso3166Alpha2("DE")).toBe(true);
    expect(isIso3166Alpha2("hr")).toBe(true);
  });

  it("rejects invalid shapes and unassigned codes", () => {
    expect(isIso3166Alpha2("D")).toBe(false);
    expect(isIso3166Alpha2("QQ")).toBe(false);
    expect(isIso3166Alpha2("")).toBe(false);
  });

  it("returns false when DisplayNames throws", () => {
    vi.spyOn(Intl, "DisplayNames").mockImplementation(function displayNamesThrows() {
      throw new Error("boom");
    } as unknown as typeof Intl.DisplayNames);
    expect(isIso3166Alpha2("DE")).toBe(false);
  });
});

describe("buildCompanyLandSelectOptions", () => {
  it("merges defaults, distinct codes, and current land sorted", () => {
    const opts = buildCompanyLandSelectOptions({
      distinctLandCodes: ["HR", "AT"],
      locale: "en",
      currentLandCode: "FR",
    });
    const values = opts.map((o) => o.value);
    expect(values).toContain("DE");
    expect(values).toContain("HR");
    expect(values).toContain("AT");
    expect(values).toContain("FR");
    expect(values).toEqual([...values].sort((a, b) => a.localeCompare(b)));
  });

  it("does not add empty current land", () => {
    const opts = buildCompanyLandSelectOptions({
      distinctLandCodes: [],
      locale: "en",
      currentLandCode: "   ",
    });
    expect(opts.map((o) => o.value)).toEqual([...DEFAULT_COMPANY_LAND_CODES]);
  });
});

describe("getLandFlagEmoji", () => {
  it("returns null for missing or non-alpha-2 input", () => {
    expect(getLandFlagEmoji(null)).toBeNull();
    expect(getLandFlagEmoji(undefined)).toBeNull();
    expect(getLandFlagEmoji("")).toBeNull();
    expect(getLandFlagEmoji("D")).toBeNull();
    expect(getLandFlagEmoji("D3")).toBeNull();
    expect(getLandFlagEmoji("de🇪")).toBeNull();
  });

  it("returns regional indicator pair for valid ISO codes", () => {
    const emoji = getLandFlagEmoji("DE");
    expect(emoji).not.toBeNull();
    const indicators = emoji?.match(/\p{Regional_Indicator}/gu);
    expect(indicators?.length).toBe(2);
  });
});

describe("exports", () => {
  it("exposes sentinel and default land codes for selects", () => {
    expect(LAND_SELECT_CLEAR_SENTINEL).toBe("__land_none__");
    expect(DEFAULT_COMPANY_LAND_CODES).toContain("DE");
  });
});
