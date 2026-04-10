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
});
