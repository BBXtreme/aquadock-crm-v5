/**
 * Tests AI enrichment validation and sanitization (subset of companySchema).
 */

import { describe, expect, it } from "vitest";
import { formatAiEnrichmentSummaryForDisplay } from "@/lib/ai/ai-enrichment-display";
import { buildCompanyEnrichmentAddressFocusInstructions } from "@/lib/ai/company-enrichment-gateway";
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
      modelMode: "grok_only",
    });
    expect(parsed.companyIds).toHaveLength(50);
    expect(parsed.modelMode).toBe("grok_only");
  });

  it("rejects more than 50 ids", () => {
    const ids = Array.from({ length: 51 }, () => "00000000-0000-4000-8000-000000000001");
    const r = bulkResearchCompanyEnrichmentInputSchema.safeParse({ companyIds: ids });
    expect(r.success).toBe(false);
  });
});

describe("buildCompanyEnrichmentAddressFocusInstructions", () => {
  it("returns a non-empty German instruction block", () => {
    const text = buildCompanyEnrichmentAddressFocusInstructions();
    expect(text.length).toBeGreaterThan(40);
    expect(text).toContain("Adress");
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
  it("drops invalid website URLs", () => {
    const parsed = companyEnrichmentAiSchema.parse({
      suggestions: {
        website: {
          value: "not a url",
          confidence: "medium",
          sources: [{ title: "S", url: "https://b.de" }],
        },
      },
    });
    const out = sanitizeEnrichmentOutput(parsed);
    expect(out.suggestions.website).toBeUndefined();
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
    expect(out.suggestions.website?.value).toBe("https://www.example.com");
  });
});
