import { describe, expect, it } from "vitest";
import { emailTemplateSchema, toEmailTemplateInsert, toEmailTemplateUpdate } from "./email-template";

describe("emailTemplateSchema", () => {
  const valid = {
    name: "Welcome",
    subject: "Hi",
    body: "<p>x</p>",
  };

  it("accepts valid payload", () => {
    expect(emailTemplateSchema.parse(valid)).toEqual(valid);
  });

  it("rejects empty name", () => {
    expect(() => emailTemplateSchema.parse({ ...valid, name: "  " })).toThrow();
  });

  it("rejects empty body", () => {
    expect(() => emailTemplateSchema.parse({ ...valid, body: "" })).toThrow();
  });
});

describe("toEmailTemplateInsert / Update", () => {
  it("maps form to insert shape", () => {
    const v = emailTemplateSchema.parse({
      name: "N",
      subject: "S",
      body: "B",
    });
    expect(toEmailTemplateInsert(v)).toEqual(v);
    expect(toEmailTemplateUpdate(v)).toEqual(v);
  });
});
