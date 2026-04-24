import { describe, expect, it } from "vitest";
import { countEffectiveAiMergeFields, mergeAiEnrichmentIntoParsedRow } from "@/lib/companies/csv-import-ai-merge";
import type { ParsedCompanyRow } from "@/lib/utils/csv-import";
import type { CompanyEnrichmentResult } from "@/lib/validations/company-enrichment";

function suggestion(
  value: string | number | null,
): NonNullable<CompanyEnrichmentResult["suggestions"]["website"]> {
  return {
    value,
    confidence: "high",
    sources: [{ title: "t", url: "https://example.com" }],
    rationale: null,
  };
}

describe("csv-import-ai-merge", () => {
  it("fills only empty optional fields", () => {
    const row: ParsedCompanyRow = {
      firmenname: "Acme",
      kundentyp: "Marina",
      website: "https://existing.com",
      telefon: undefined,
    };
    const result: CompanyEnrichmentResult = {
      aiSummary: null,
      suggestions: {
        website: suggestion("https://new.example"),
        telefon: suggestion("+49 1"),
      },
    };
    const merged = mergeAiEnrichmentIntoParsedRow(row, result);
    expect(merged.website).toBe("https://existing.com");
    expect(merged.telefon).toBe("+49 1");
  });

  it("maps stadt suggestion to ort", () => {
    const row: ParsedCompanyRow = {
      firmenname: "Acme",
      kundentyp: "Marina",
    };
    const result: CompanyEnrichmentResult = {
      aiSummary: null,
      suggestions: {
        stadt: suggestion("Hamburg"),
      },
    };
    const merged = mergeAiEnrichmentIntoParsedRow(row, result);
    expect(merged.ort).toBe("Hamburg");
  });

  it("countEffectiveAiMergeFields matches actual diff", () => {
    const row: ParsedCompanyRow = {
      firmenname: "Acme",
      kundentyp: "Marina",
      plz: "",
    };
    const result: CompanyEnrichmentResult = {
      aiSummary: null,
      suggestions: {
        plz: suggestion("20095"),
        land: suggestion("DE"),
      },
    };
    expect(countEffectiveAiMergeFields(row, result)).toBe(2);
  });

  it("skips suggestions with null or missing value", () => {
    const row: ParsedCompanyRow = { firmenname: "Acme", kundentyp: "Marina" };
    const result: CompanyEnrichmentResult = {
      aiSummary: null,
      suggestions: {
        email: { value: null, confidence: "high", sources: [], rationale: null },
        telefon: suggestion("+1"),
      },
    };
    const merged = mergeAiEnrichmentIntoParsedRow(row, result);
    expect(merged.email).toBeUndefined();
    expect(merged.telefon).toBe("+1");
  });

  it("fills wasserdistanz only when row has none and suggestion is a number", () => {
    const row: ParsedCompanyRow = { firmenname: "Acme", kundentyp: "Marina", wasser_distanz: undefined };
    const withString = mergeAiEnrichmentIntoParsedRow(row, {
      aiSummary: null,
      suggestions: { wasserdistanz: suggestion("not-a-number") },
    });
    expect(withString.wasser_distanz).toBeUndefined();

    const withNum = mergeAiEnrichmentIntoParsedRow(row, {
      aiSummary: null,
      suggestions: { wasserdistanz: suggestion(250) },
    });
    expect(withNum.wasser_distanz).toBe(250);

    const alreadySet = mergeAiEnrichmentIntoParsedRow(
      { ...row, wasser_distanz: 10 },
      { aiSummary: null, suggestions: { wasserdistanz: suggestion(99) } },
    );
    expect(alreadySet.wasser_distanz).toBe(10);
  });

  it("does not overwrite from notes or firmentyp suggestions", () => {
    const row: ParsedCompanyRow = { firmenname: "Acme", kundentyp: "Marina" };
    const merged = mergeAiEnrichmentIntoParsedRow(row, {
      aiSummary: null,
      suggestions: {
        notes: suggestion("ignored"),
        firmentyp: suggestion("ignored"),
      },
    });
    expect(merged).toEqual(row);
  });

  it("fills strasse, bundesland, wassertyp, kundentyp when empty", () => {
    const row: ParsedCompanyRow = { firmenname: "Acme", kundentyp: "" };
    const merged = mergeAiEnrichmentIntoParsedRow(row, {
      aiSummary: null,
      suggestions: {
        strasse: suggestion("Hafen 1"),
        bundesland: suggestion("HH"),
        wassertyp: suggestion("see"),
        kundentyp: suggestion("marina"),
      },
    });
    expect(merged.strasse).toBe("Hafen 1");
    expect(merged.bundesland).toBe("HH");
    expect(merged.wassertyp).toBe("see");
    expect(merged.kundentyp).toBe("marina");
  });

  it("does not overwrite kundentyp when already set", () => {
    const row: ParsedCompanyRow = { firmenname: "Acme", kundentyp: "Marina" };
    const merged = mergeAiEnrichmentIntoParsedRow(row, {
      aiSummary: null,
      suggestions: { kundentyp: suggestion("Hafen") },
    });
    expect(merged.kundentyp).toBe("Marina");
  });

  it("fills plz and land when empty", () => {
    const row: ParsedCompanyRow = { firmenname: "Acme", kundentyp: "Marina", plz: "", land: "" };
    const merged = mergeAiEnrichmentIntoParsedRow(row, {
      aiSummary: null,
      suggestions: { plz: suggestion("20095"), land: suggestion("DE") },
    });
    expect(merged.plz).toBe("20095");
    expect(merged.land).toBe("DE");
  });

  it("treats telefon of only whitespace as empty for merge", () => {
    const row: ParsedCompanyRow = { firmenname: "Acme", kundentyp: "Marina", telefon: "  \t" };
    const merged = mergeAiEnrichmentIntoParsedRow(row, {
      aiSummary: null,
      suggestions: { telefon: suggestion("+49 40 1") },
    });
    expect(merged.telefon).toBe("+49 40 1");
  });

  it("skips undefined suggestion entries", () => {
    const row: ParsedCompanyRow = { firmenname: "Acme", kundentyp: "Marina", website: "" };
    const merged = mergeAiEnrichmentIntoParsedRow(row, {
      aiSummary: null,
      suggestions: {
        website: undefined,
        email: suggestion("a@b.de"),
      },
    });
    expect(merged.website).toBe("");
    expect(merged.email).toBe("a@b.de");
  });

  it("countEffectiveAiMergeFields treats numeric change as diff", () => {
    const row: ParsedCompanyRow = {
      firmenname: "Acme",
      kundentyp: "Marina",
      wasser_distanz: undefined,
    };
    const result: CompanyEnrichmentResult = {
      aiSummary: null,
      suggestions: { wasserdistanz: suggestion(50) },
    };
    expect(countEffectiveAiMergeFields(row, result)).toBe(1);
  });
});
