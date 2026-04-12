import { describe, expect, it } from "vitest";
import {
  buildCompanyEnrichmentClosedEnumPromptBlock,
  normalizeAgainstAllowedList,
  normalizeFirmentypForEnrichment,
  normalizeKundentypForEnrichment,
} from "@/lib/ai/company-enrichment-closed-enums";

describe("company-enrichment-closed-enums", () => {
  it("normalizeAgainstAllowedList handles empty and exact matches", () => {
    const allowed = ["a", "b"] as const;
    expect(normalizeAgainstAllowedList("  ", [...allowed])).toBeNull();
    expect(normalizeAgainstAllowedList("a", [...allowed])).toBe("a");
    expect(normalizeAgainstAllowedList("A", [...allowed])).toBe("a");
  });

  it("normalizeAgainstAllowedList uses label lookup when provided", () => {
    const allowed = ["einzeln", "kette"] as const;
    const lookup = { chain: "kette", einzel: "einzeln" };
    expect(normalizeAgainstAllowedList("chain", [...allowed], lookup)).toBe("kette");
    expect(normalizeAgainstAllowedList("Chain", [...allowed], lookup)).toBe("kette");
  });

  it("normalizeAgainstAllowedList substring branch for length >= 4", () => {
    const allowed = ["Fluss", "See"] as const;
    expect(normalizeAgainstAllowedList("Flussufer", [...allowed])).toBe("Fluss");
  });

  it("normalizeKundentypForEnrichment nullish", () => {
    expect(normalizeKundentypForEnrichment(null)).toBeNull();
    expect(normalizeKundentypForEnrichment(undefined)).toBeNull();
  });

  it("normalizeFirmentypForEnrichment maps English synonyms", () => {
    expect(normalizeFirmentypForEnrichment("chain")).toBe("kette");
    expect(normalizeFirmentypForEnrichment("single")).toBe("einzeln");
  });

  it("buildCompanyEnrichmentClosedEnumPromptBlock lists closed fields", () => {
    const block = buildCompanyEnrichmentClosedEnumPromptBlock();
    expect(block).toContain("kundentyp");
    expect(block).toContain("firmentyp");
    expect(block).toContain("wassertyp");
    expect(block).toContain("Geschlossene CRM-Select-Felder");
  });
});
