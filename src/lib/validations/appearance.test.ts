import { describe, expect, it } from "vitest";
import {
  appearanceColorSchemeSchema,
  appearanceLocaleSchema,
  appearanceThemeSchema,
  appearanceTimeZoneSchema,
  isValidIanaTimeZone,
  parseAppearanceColorScheme,
  parseAppearanceLocale,
  parseAppearanceTheme,
  parseAppearanceTimeZone,
} from "./appearance";

describe("appearance enums", () => {
  it("parses theme", () => {
    expect(appearanceThemeSchema.parse("dark")).toBe("dark");
  });

  it("parses locale", () => {
    expect(appearanceLocaleSchema.parse("en")).toBe("en");
  });

  it("parses color scheme", () => {
    const id = appearanceColorSchemeSchema.options[0];
    if (id === undefined) {
      throw new Error("no scheme");
    }
    expect(appearanceColorSchemeSchema.parse(id)).toBe(id);
  });
});

describe("isValidIanaTimeZone", () => {
  it("accepts Europe/Berlin", () => {
    expect(isValidIanaTimeZone("Europe/Berlin")).toBe(true);
  });

  it("rejects invalid", () => {
    expect(isValidIanaTimeZone("Not/AZone")).toBe(false);
  });
});

describe("appearanceTimeZoneSchema", () => {
  it("accepts valid zone", () => {
    expect(appearanceTimeZoneSchema.parse("Europe/Berlin")).toBe("Europe/Berlin");
  });

  it("rejects invalid zone string", () => {
    expect(() => appearanceTimeZoneSchema.parse("bad/tz")).toThrow();
  });
});

describe("parse helpers", () => {
  it("parseAppearanceTheme returns null for bad input", () => {
    expect(parseAppearanceTheme(null)).toBeNull();
    expect(parseAppearanceTheme(undefined)).toBeNull();
    expect(parseAppearanceTheme(1)).toBeNull();
    expect(parseAppearanceTheme("nope")).toBeNull();
  });

  it("parseAppearanceTheme accepts value", () => {
    expect(parseAppearanceTheme(" light ")).toBe("light");
  });

  it("parseAppearanceLocale maps fr to de", () => {
    expect(parseAppearanceLocale("fr")).toBe("de");
  });

  it("parseAppearanceLocale returns null for null, undefined, non-string, and unknown codes", () => {
    expect(parseAppearanceLocale(null)).toBeNull();
    expect(parseAppearanceLocale(undefined)).toBeNull();
    expect(parseAppearanceLocale({})).toBeNull();
    expect(parseAppearanceLocale("  fr  ")).toBe("de");
    expect(parseAppearanceLocale("xx")).toBeNull();
  });

  it("parseAppearanceLocale accepts trimmed supported codes", () => {
    expect(parseAppearanceLocale("  de  ")).toBe("de");
    expect(parseAppearanceLocale("en")).toBe("en");
  });

  it("parseAppearanceColorScheme", () => {
    const id = appearanceColorSchemeSchema.options[0];
    if (id === undefined) {
      throw new Error("no scheme");
    }
    expect(parseAppearanceColorScheme(id)).toBe(id);
    expect(parseAppearanceColorScheme("___")).toBeNull();
  });

  it("parseAppearanceColorScheme returns null for null, undefined, and non-string", () => {
    expect(parseAppearanceColorScheme(null)).toBeNull();
    expect(parseAppearanceColorScheme(undefined)).toBeNull();
    expect(parseAppearanceColorScheme(99)).toBeNull();
  });

  it("parseAppearanceTimeZone", () => {
    expect(parseAppearanceTimeZone("Europe/Berlin")).toBe("Europe/Berlin");
    expect(parseAppearanceTimeZone("bad")).toBeNull();
  });

  it("parseAppearanceTimeZone returns null for null, undefined, non-string, empty, and invalid IANA", () => {
    expect(parseAppearanceTimeZone(null)).toBeNull();
    expect(parseAppearanceTimeZone(undefined)).toBeNull();
    expect(parseAppearanceTimeZone(true)).toBeNull();
    expect(parseAppearanceTimeZone("   ")).toBeNull();
    expect(parseAppearanceTimeZone("Not/AZone")).toBeNull();
  });
});
