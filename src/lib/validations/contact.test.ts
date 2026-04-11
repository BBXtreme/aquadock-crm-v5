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

  it("maps company_id empty string to null", () => {
    const out = contactSchema.parse({
      vorname: "A",
      nachname: "B",
      company_id: "",
    });
    expect(out.company_id).toBeNull();
  });

  it("maps email empty string to null", () => {
    const out = contactSchema.parse({
      vorname: "A",
      nachname: "B",
      email: "",
    });
    expect(out.email).toBeNull();
  });

  it("rejects invalid email when provided", () => {
    expect(() =>
      contactSchema.parse({
        vorname: "A",
        nachname: "B",
        email: "not-an-email",
      }),
    ).toThrow(/Ungültige/);
  });

  it.each(["Herr", "Frau", "Dr.", "Prof."] as const)("accepts anrede %s", (anrede) => {
    const out = contactSchema.parse({
      vorname: "X",
      nachname: "Y",
      anrede,
    });
    expect(out.anrede).toBe(anrede);
  });

  it("rejects vorname longer than 100 characters", () => {
    expect(() =>
      contactSchema.parse({
        vorname: "x".repeat(101),
        nachname: "Y",
      }),
    ).toThrow();
  });

  it("rejects unknown keys under strict", () => {
    expect(() =>
      contactSchema.parse({
        vorname: "A",
        nachname: "B",
        extra: 1,
      } as Record<string, unknown>),
    ).toThrow();
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

  it("toContactUpdate omits is_primary when not provided on parsed values", () => {
    const minimal = contactSchema.parse({
      vorname: "A",
      nachname: "B",
    });
    expect(toContactUpdate(minimal).is_primary).toBeUndefined();
  });

  it("maps optional string fields through toContactInsert", () => {
    const v = contactSchema.parse({
      vorname: "A",
      nachname: "B",
      position: "  Lead  ",
      telefon: " 040 ",
      mobil: "0171",
      durchwahl: "12",
      notes: "  Hi  ",
    });
    const row = toContactInsert(v);
    expect(row.position).toBe("Lead");
    expect(row.telefon).toBe("040");
    expect(row.mobil).toBe("0171");
    expect(row.durchwahl).toBe("12");
    expect(row.notes).toBe("Hi");
  });
});
