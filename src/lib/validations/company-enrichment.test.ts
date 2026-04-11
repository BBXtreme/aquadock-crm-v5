/**
 * Tests AI enrichment validation and sanitization (subset of companySchema).
 */

import { describe, expect, it } from "vitest";
import {
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
