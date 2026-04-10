import { describe, expect, it } from "vitest";
import { determineFirmentyp, determineKundentyp } from "@/lib/constants";

describe("constants barrel", () => {
  it("determineKundentyp maps amenity", () => {
    expect(determineKundentyp({ amenity: "restaurant" })).toBe("restaurant");
  });

  it("determineKundentyp falls back to sonstige", () => {
    expect(determineKundentyp({})).toBe("sonstige");
  });

  it("determineFirmentyp detects kette", () => {
    expect(determineFirmentyp({ brand: "X" })).toBe("kette");
  });

  it("determineFirmentyp defaults einzeln", () => {
    expect(determineFirmentyp({})).toBe("einzeln");
  });
});
