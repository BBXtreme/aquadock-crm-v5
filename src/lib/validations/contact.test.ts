import { describe, expect, it } from "vitest";
import { contactSchema, toContactInsert, toContactUpdate } from "./contact";

const companyId = "123e4567-e89b-12d3-a456-426614174000";

describe("contactSchema", () => {
  it("accepts minimal valid contact", () => {
    const out = contactSchema.parse({
      vorname: "Max",
      nachname: "Mustermann",
    });
    expect(out.vorname).toBe("Max");
  });

  it("omits email when undefined", () => {
    const out = contactSchema.parse({
      vorname: "A",
      nachname: "B",
    });
    expect(out.email).toBeUndefined();
  });

  it("rejects invalid company id", () => {
    expect(() =>
      contactSchema.parse({
        vorname: "A",
        nachname: "B",
        company_id: "bad",
      }),
    ).toThrow();
  });

  it("accepts company uuid", () => {
    const out = contactSchema.parse({
      vorname: "A",
      nachname: "B",
      company_id: companyId,
    });
    expect(out.company_id).toBe(companyId);
  });
});

describe("toContactInsert / toContactUpdate", () => {
  const values = contactSchema.parse({
    vorname: "A",
    nachname: "B",
    anrede: "Herr",
    email: "a@b.co",
    company_id: companyId,
    is_primary: true,
  });

  it("maps insert", () => {
    const ins = toContactInsert(values);
    expect(ins.vorname).toBe("A");
    expect(ins.company_id).toBe(companyId);
  });

  it("maps update", () => {
    const upd = toContactUpdate(values);
    expect(upd.nachname).toBe("B");
  });
});
