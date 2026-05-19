import { describe, expect, it } from "vitest";
import {
  determineWassertyp,
  normalizeGewaesserartValue,
  normalizeWassertypForEnrichment,
} from "@/lib/constants/wassertyp";

describe("normalizeGewaesserartValue", () => {
  it("maps legacy Küste to Küste / Meer", () => {
    expect(normalizeGewaesserartValue("Küste")).toBe("Küste / Meer");
  });

  it("accepts canonical wassertyp values", () => {
    expect(normalizeGewaesserartValue("Hafen")).toBe("Hafen");
  });
});

describe("normalizeWassertypForEnrichment", () => {
  it("returns null for nullish and blank", () => {
    expect(normalizeWassertypForEnrichment(null)).toBeNull();
    expect(normalizeWassertypForEnrichment(undefined)).toBeNull();
    expect(normalizeWassertypForEnrichment("   ")).toBeNull();
  });

  it("returns exact allowed value", () => {
    expect(normalizeWassertypForEnrichment("Fluss")).toBe("Fluss");
  });

  it("matches case-insensitive full label", () => {
    expect(normalizeWassertypForEnrichment("fluss")).toBe("Fluss");
  });

  it("uses enrichment gloss and returns null for unknown text", () => {
    expect(normalizeWassertypForEnrichment("river")).toBe("Fluss");
    expect(normalizeWassertypForEnrichment("marina")).toBe("Hafen");
    expect(normalizeWassertypForEnrichment("stau")).toBe("Stausee");
    expect(normalizeWassertypForEnrichment("totally unknown xyz")).toBeNull();
  });
});

describe("determineWassertyp", () => {
  it("returns first OSM-mapped value from tag values", () => {
    expect(determineWassertyp({ water: "lake" })).toBe("See");
    expect(determineWassertyp({ a: "x", b: "lake" })).toBe("See");
  });

  it("returns null when no tag value maps", () => {
    expect(determineWassertyp({ amenity: "parking" })).toBeNull();
  });
});
