import { describe, expect, it } from "vitest";
import {
  contactEnrichmentAiSchema,
  sanitizeContactEnrichmentOutput,
} from "@/lib/validations/contact-enrichment";

describe("contactEnrichmentAiSchema", () => {
  it("parses minimal valid AI payload", () => {
    const parsed = contactEnrichmentAiSchema.parse({
      aiSummary: "  Kurz  ",
      suggestions: {
        email: {
          value: "a@example.com",
          confidence: "high",
          sources: [{ title: "Src", url: "https://example.com" }],
        },
      },
    });
    expect(parsed.aiSummary).toBe("Kurz");
    expect(parsed.suggestions.email?.value).toBe("a@example.com");
  });
});

describe("sanitizeContactEnrichmentOutput", () => {
  it("drops invalid email suggestions", () => {
    const parsed = contactEnrichmentAiSchema.parse({
      suggestions: {
        email: {
          value: "not-an-email",
          confidence: "low",
          sources: [{ title: "S", url: "https://b.de" }],
        },
      },
    });
    const out = sanitizeContactEnrichmentOutput(parsed);
    expect(out.suggestions.email).toBeUndefined();
  });

  it("accepts valid email", () => {
    const parsed = contactEnrichmentAiSchema.parse({
      suggestions: {
        email: {
          value: "valid@example.com",
          confidence: "medium",
          sources: [{ title: "S", url: "https://b.de" }],
        },
      },
    });
    const out = sanitizeContactEnrichmentOutput(parsed);
    expect(out.suggestions.email?.value).toBe("valid@example.com");
  });
});
