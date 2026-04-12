/**
 * Tests AI enrichment validation and sanitization (subset of companySchema).
 */

import { describe, expect, it } from "vitest";
import { formatAiEnrichmentSummaryForDisplay } from "@/lib/ai/ai-enrichment-display";
import {
  bulkResearchCompanyEnrichmentInputSchema,
  companyEnrichmentAiSchema,
  sanitizeEnrichmentOutput,
} from "@/lib/validations/company-enrichment";

describe("companyEnrichmentAiSchema", () => {
  it("parses minimal valid AI payload", () => {
    const parsed = companyEnrichmentAiSchema.parse({
      aiSummary: "  Kurz  ",
      suggestions: {
        website: {
          value: "https://example.com",
          confidence: "high",
          sources: [{ title: "Ex", url: "https://example.com" }],
        },
      },
    });
    expect(parsed.aiSummary).toBe("Kurz");
    expect(parsed.suggestions.website?.value).toBe("https://example.com");
  });

  it("maps empty strings to null via transforms", () => {
    const parsed = companyEnrichmentAiSchema.parse({
      aiSummary: "",
      suggestions: {
        email: {
          value: "",
          confidence: "low",
          sources: [{ title: "Src", url: "https://a.de" }],
        },
      },
    });
    expect(parsed.aiSummary).toBeNull();
    expect(parsed.suggestions.email?.value).toBeNull();
  });
});

describe("bulkResearchCompanyEnrichmentInputSchema", () => {
  it("accepts up to 50 unique company ids", () => {
    const ids = Array.from({ length: 50 }, () => "00000000-0000-4000-8000-000000000001");
    const parsed = bulkResearchCompanyEnrichmentInputSchema.parse({
      companyIds: ids,
    });
    expect(parsed.companyIds).toHaveLength(50);
  });

  it("rejects more than 50 ids", () => {
    const ids = Array.from({ length: 51 }, () => "00000000-0000-4000-8000-000000000001");
    const r = bulkResearchCompanyEnrichmentInputSchema.safeParse({ companyIds: ids });
    expect(r.success).toBe(false);
  });
});

describe("formatAiEnrichmentSummaryForDisplay", () => {
  it("strips C0 controls except newline and tab", () => {
    const out = formatAiEnrichmentSummaryForDisplay("Line one\u0007\nLine two");
    expect(out).toBe("Line one\nLine two");
  });

  it("flattens common markdown emphasis markers", () => {
    expect(formatAiEnrichmentSummaryForDisplay("**Bold** and *italic*")).toBe("Bold and italic");
  });
});

describe("sanitizeEnrichmentOutput", () => {
  it("drops email that fails companySchema refine", () => {
    const parsed = companyEnrichmentAiSchema.parse({
      suggestions: {
        email: {
          value: "not-an-email",
          confidence: "medium",
          sources: [{ title: "S", url: "https://b.de" }],
        },
      },
    });
    const out = sanitizeEnrichmentOutput(parsed);
    expect(out.suggestions.email).toBeUndefined();
  });

  it("accepts bare domain after normalization", () => {
    const parsed = companyEnrichmentAiSchema.parse({
      suggestions: {
        website: {
          value: "www.example.com",
          confidence: "high",
          sources: [{ title: "S", url: "https://b.de" }],
        },
      },
    });
    const out = sanitizeEnrichmentOutput(parsed);
    expect(out.suggestions.website?.value).toBe("www.example.com");
  });

  it("normalizes wassertyp free-text to allowed CRM enum", () => {
    const parsed = companyEnrichmentAiSchema.parse({
      suggestions: {
        wassertyp: {
          value: "lake",
          confidence: "medium",
          sources: [{ title: "S", url: "https://b.de" }],
        },
      },
    });
    expect(parsed.suggestions.wassertyp?.value).toBe("See");
    const out = sanitizeEnrichmentOutput(parsed);
    expect(out.suggestions.wassertyp?.value).toBe("See");
  });

  it("drops wassertyp when value cannot be mapped to enum", () => {
    const parsed = companyEnrichmentAiSchema.parse({
      suggestions: {
        wassertyp: {
          value: "Brackwasser-XYZ-unbekannt",
          confidence: "low",
          sources: [{ title: "S", url: "https://b.de" }],
        },
      },
    });
    expect(parsed.suggestions.wassertyp?.value).toBeNull();
    const out = sanitizeEnrichmentOutput(parsed);
    expect(out.suggestions.wassertyp).toBeUndefined();
  });

  it("normalizes kundentyp label text to allowed CRM enum", () => {
    const parsed = companyEnrichmentAiSchema.parse({
      suggestions: {
        kundentyp: {
          value: "  Hotel  ",
          confidence: "medium",
          sources: [{ title: "S", url: "https://b.de" }],
        },
      },
    });
    expect(parsed.suggestions.kundentyp?.value).toBe("hotel");
    const out = sanitizeEnrichmentOutput(parsed);
    expect(out.suggestions.kundentyp?.value).toBe("hotel");
  });

  it("normalizes firmentyp synonym to allowed CRM enum", () => {
    const parsed = companyEnrichmentAiSchema.parse({
      suggestions: {
        firmentyp: {
          value: "chain",
          confidence: "high",
          sources: [{ title: "S", url: "https://b.de" }],
        },
      },
    });
    expect(parsed.suggestions.firmentyp?.value).toBe("kette");
    const out = sanitizeEnrichmentOutput(parsed);
    expect(out.suggestions.firmentyp?.value).toBe("kette");
  });

  it("drops firmentyp when value cannot be mapped", () => {
    const parsed = companyEnrichmentAiSchema.parse({
      suggestions: {
        firmentyp: {
          value: "GmbH",
          confidence: "low",
          sources: [{ title: "S", url: "https://b.de" }],
        },
      },
    });
    expect(parsed.suggestions.firmentyp?.value).toBeNull();
    const out = sanitizeEnrichmentOutput(parsed);
    expect(out.suggestions.firmentyp).toBeUndefined();
  });
});
