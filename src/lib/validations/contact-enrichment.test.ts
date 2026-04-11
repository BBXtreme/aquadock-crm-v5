import { describe, expect, it } from "vitest";
import {
  bulkResearchContactEnrichmentInputSchema,
  contactEnrichmentAiSchema,
  sanitizeContactEnrichmentOutput,
} from "@/lib/validations/contact-enrichment";

describe("bulkResearchContactEnrichmentInputSchema", () => {
  it("accepts up to 50 contact ids", () => {
    const ids = Array.from({ length: 50 }, () => "00000000-0000-4000-8000-000000000002");
    const parsed = bulkResearchContactEnrichmentInputSchema.parse({
      contactIds: ids,
      modelMode: "auto",
    });
    expect(parsed.contactIds).toHaveLength(50);
    expect(parsed.modelMode).toBe("auto");
  });

  it("rejects empty id list", () => {
    const r = bulkResearchContactEnrichmentInputSchema.safeParse({ contactIds: [] });
    expect(r.success).toBe(false);
  });
});

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
