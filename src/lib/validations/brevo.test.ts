import { describe, expect, it } from "vitest";
import {
  brevoCampaignSchema,
  brevoSelectedRecipientsSchema,
  brevoSyncSchema,
} from "./brevo";

describe("brevoCampaignSchema", () => {
  it("accepts template-only campaign", () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    const out = brevoCampaignSchema.parse({
      name: "C1",
      subject: "",
      htmlContent: "",
      listIds: [],
      selectedTemplate: id,
    });
    expect(out.selectedTemplate).toBe(id);
  });

  it("requires subject and html when no template", () => {
    expect(() =>
      brevoCampaignSchema.parse({
        name: "C1",
        subject: "",
        htmlContent: "short",
        listIds: [],
      }),
    ).toThrow(/Betreff/);
  });

  it("requires long html when no template", () => {
    expect(() =>
      brevoCampaignSchema.parse({
        name: "C1",
        subject: "Subj",
        htmlContent: "x".repeat(10),
        listIds: [],
      }),
    ).toThrow(/HTML/);
  });

  it("rejects whitespace-only subject when no template even if html is long enough", () => {
    expect(() =>
      brevoCampaignSchema.parse({
        name: "C1",
        subject: "\t  \n",
        htmlContent: "x".repeat(20),
        listIds: [],
      }),
    ).toThrow(/Betreff/);
  });

  it("rejects html under 20 characters after trim when subject is valid", () => {
    expect(() =>
      brevoCampaignSchema.parse({
        name: "C1",
        subject: "Betreff",
        htmlContent: `  ${"x".repeat(18)}  `,
        listIds: [],
      }),
    ).toThrow(/HTML/);
  });

  it("accepts custom subject and long html without template", () => {
    const out = brevoCampaignSchema.parse({
      name: "C1",
      subject: "Hello",
      htmlContent: "x".repeat(20),
      listIds: [1, 2],
    });
    expect(out.subject).toBe("Hello");
  });

  it("treats empty selectedTemplate as undefined", () => {
    const out = brevoCampaignSchema.parse({
      name: "C1",
      subject: "S",
      htmlContent: "y".repeat(25),
      listIds: [],
      selectedTemplate: "",
    });
    expect(out.selectedTemplate).toBeUndefined();
  });

  it("treats null selectedTemplate like no template for superRefine", () => {
    expect(() =>
      brevoCampaignSchema.parse({
        name: "C1",
        subject: "",
        htmlContent: "",
        listIds: [],
        selectedTemplate: null,
      }),
    ).toThrow(/Betreff/);
  });

  it("defaults listIds when omitted", () => {
    const out = brevoCampaignSchema.parse({
      name: "C2",
      subject: "S",
      htmlContent: "z".repeat(20),
    });
    expect(out.listIds).toEqual([]);
  });

  it("parses optional scheduledAt and preserves selectedTemplate uuid", () => {
    const id = "123e4567-e89b-12d3-a456-426614174000";
    const out = brevoCampaignSchema.parse({
      name: "C3",
      subject: "",
      htmlContent: "",
      listIds: [9],
      selectedTemplate: id,
      scheduledAt: "2026-12-01T10:00:00Z",
    });
    expect(out.scheduledAt).toBe("2026-12-01T10:00:00Z");
    expect(out.selectedTemplate).toBe(id);
    expect(out.listIds).toEqual([9]);
  });

  it("rejects unknown keys under strict", () => {
    expect(() =>
      brevoCampaignSchema.parse({
        name: "C",
        subject: "S",
        htmlContent: "x".repeat(20),
        listIds: [],
        unknown: 1,
      } as Record<string, unknown>),
    ).toThrow();
  });
});

describe("brevoSelectedRecipientsSchema", () => {
  it("accepts uuid array", () => {
    const u = "123e4567-e89b-12d3-a456-426614174000";
    expect(brevoSelectedRecipientsSchema.parse([u])).toEqual([u]);
  });

  it("rejects invalid uuid", () => {
    expect(() => brevoSelectedRecipientsSchema.parse(["nope"])).toThrow();
  });
});

describe("brevoSyncSchema", () => {
  it("accepts empty object", () => {
    expect(brevoSyncSchema.parse({})).toEqual({});
  });

  it("accepts filters", () => {
    expect(
      brevoSyncSchema.parse({
        filterKundentyp: "marina",
        filterStatus: "lead",
      }),
    ).toEqual({ filterKundentyp: "marina", filterStatus: "lead" });
  });

  it("rejects unknown keys under strict", () => {
    expect(() => brevoSyncSchema.parse({ filterKundentyp: "x", extra: true } as Record<string, unknown>)).toThrow();
  });
});
