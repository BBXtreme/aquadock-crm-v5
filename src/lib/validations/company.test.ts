/**
 * Tests CRM validation schemas exported alongside company (barrel: company, contact, reminder, timeline).
 * Schema names in product code: companySchema, contactSchema, reminderSchema / reminderFormSchema, timelineSchema.
 */

import { describe, expect, it, test } from "vitest";
import { companySchema, toCompanyInsert, toCompanyUpdate } from "@/lib/validations/company";
import { contactSchema, toContactInsert } from "@/lib/validations/contact";
import { reminderFormSchema, reminderSchema } from "@/lib/validations/reminder";
import { timelineSchema, toTimelineInsert } from "@/lib/validations/timeline";

const COMPANY_UUID = "550e8400-e29b-41d4-a716-446655440000";
const USER_UUID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

function isoDaysFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

describe("companySchema", () => {
  const minimal = {
    firmenname: "Acme GmbH",
    kundentyp: "restaurant" as const,
    status: "lead" as const,
  };

  it("accepts a minimal valid company", () => {
    const parsed = companySchema.parse(minimal);
    expect(parsed.firmenname).toBe("Acme GmbH");
    expect(parsed.kundentyp).toBe("restaurant");
    expect(parsed.status).toBe("lead");
  });

  it("trims firmenname", () => {
    const parsed = companySchema.parse({
      ...minimal,
      firmenname: "  Trimmed Co  ",
    });
    expect(parsed.firmenname).toBe("Trimmed Co");
  });

  it("rejects empty firmenname after trim", () => {
    expect(() => companySchema.parse({ ...minimal, firmenname: "   " })).toThrow();
  });

  test.each([
    ["invalid-kundentyp", { kundentyp: "invalid" }],
    ["invalid-status", { status: "unknown" }],
  ] as const)("rejects %s enum", (_label, patch) => {
    expect(() => companySchema.parse({ ...minimal, ...patch })).toThrow();
  });

  it("rejects unknown keys in strict mode", () => {
    expect(() =>
      companySchema.parse({
        ...minimal,
        unexpected: true,
      }),
    ).toThrow();
  });

  it("maps website and email empty string to null via transform where URL/email valid path does not apply", () => {
    const withSite = companySchema.parse({
      ...minimal,
      website: "https://example.com",
      email: "team@example.com",
    });
    expect(withSite.website).toBe("https://example.com");
    expect(withSite.email).toBe("team@example.com");
  });

  it("rejects invalid website URL", () => {
    expect(() => companySchema.parse({ ...minimal, website: "not-a-url" })).toThrow();
  });

  it("accepts valid OSM id format", () => {
    const parsed = companySchema.parse({ ...minimal, osm: "node/12345" });
    expect(parsed.osm).toBe("node/12345");
  });

  it("rejects invalid OSM format", () => {
    expect(() => companySchema.parse({ ...minimal, osm: "bad" })).toThrow();
  });

  it("coerces lat/lon empty string to null via preprocess", () => {
    const parsed = companySchema.parse({
      ...minimal,
      lat: "",
      lon: "",
    });
    expect(parsed.lat).toBeNull();
    expect(parsed.lon).toBeNull();
  });

  it("rejects lat out of range", () => {
    expect(() => companySchema.parse({ ...minimal, lat: 91 })).toThrow();
  });

  it("produces a Supabase-ready insert via toCompanyInsert", () => {
    const values = companySchema.parse({
      ...minimal,
      rechtsform: null,
      website: null,
      email: null,
    });
    const row = toCompanyInsert(values);
    expect(row.firmenname).toBe("Acme GmbH");
    expect(row.website).toBeNull();
    expect(row.email).toBeNull();
  });

  const KUNDENTYPEN = [
    "restaurant",
    "hotel",
    "resort",
    "camping",
    "marina",
    "segelschule",
    "segelverein",
    "bootsverleih",
    "neukunde",
    "bestandskunde",
    "interessent",
    "partner",
    "sonstige",
  ] as const;

  const STATUSES = [
    "lead",
    "interessant",
    "qualifiziert",
    "akquise",
    "angebot",
    "gewonnen",
    "verloren",
    "kunde",
    "partner",
    "inaktiv",
  ] as const;

  it.each(KUNDENTYPEN)("accepts kundentyp %s", (kundentyp) => {
    const parsed = companySchema.parse({ ...minimal, kundentyp });
    expect(parsed.kundentyp).toBe(kundentyp);
  });

  it.each(STATUSES)("accepts status %s", (status) => {
    const parsed = companySchema.parse({ ...minimal, status });
    expect(parsed.status).toBe(status);
  });

  it("accepts boundary lat/lon and way/relation OSM ids", () => {
    const parsed = companySchema.parse({
      ...minimal,
      lat: -90,
      lon: 180,
      osm: "way/1",
    });
    expect(parsed.lat).toBe(-90);
    expect(parsed.lon).toBe(180);
    expect(companySchema.parse({ ...minimal, osm: "relation/99" }).osm).toBe("relation/99");
  });

  it("maps optional empty strings and zero numerics via toCompanyInsert and toCompanyUpdate", () => {
    const values = companySchema.parse({
      ...minimal,
      rechtsform: "",
      firmentyp: "",
      telefon: "",
      strasse: "",
      plz: "",
      stadt: "",
      bundesland: "",
      land: "",
      wassertyp: "",
      osm: null,
      notes: "",
      wasserdistanz: 0,
      value: 0,
    });
    const insert = toCompanyInsert(values);
    const update = toCompanyUpdate(values);
    for (const row of [insert, update]) {
      expect(row.rechtsform).toBeNull();
      expect(row.firmentyp).toBeNull();
      expect(row.telefon).toBeNull();
      expect(row.strasse).toBeNull();
      expect(row.plz).toBeNull();
      expect(row.stadt).toBeNull();
      expect(row.bundesland).toBeNull();
      expect(row.land).toBeNull();
      expect(row.wassertyp).toBeNull();
      expect(row.osm).toBeNull();
      expect(row.notes).toBeNull();
      expect(row.wasserdistanz).toBe(0);
      expect(row.value).toBe(0);
    }
  });
});

describe("contactSchema", () => {
  const base = {
    vorname: "Max",
    nachname: "Mustermann",
  };

  it("accepts minimal contact and maps is_primary on insert", () => {
    const parsed = contactSchema.parse(base);
    expect(parsed.vorname).toBe("Max");
    expect(toContactInsert(parsed).is_primary).toBe(false);
  });

  it("trims vorname and nachname", () => {
    const parsed = contactSchema.parse({
      vorname: "  Anna  ",
      nachname: "  Schmidt  ",
    });
    expect(parsed.vorname).toBe("Anna");
    expect(parsed.nachname).toBe("Schmidt");
  });

  it("accepts anrede enum", () => {
    const parsed = contactSchema.parse({ ...base, anrede: "Frau" });
    expect(parsed.anrede).toBe("Frau");
  });

  it("rejects invalid anrede", () => {
    expect(() => contactSchema.parse({ ...base, anrede: "Sir" })).toThrow();
  });

  it("accepts valid company_id uuid", () => {
    const parsed = contactSchema.parse({ ...base, company_id: COMPANY_UUID });
    expect(parsed.company_id).toBe(COMPANY_UUID);
  });

  it("rejects invalid company_id when provided", () => {
    expect(() => contactSchema.parse({ ...base, company_id: "not-uuid" })).toThrow();
  });

  it("rejects unknown keys in strict mode", () => {
    expect(() =>
      contactSchema.parse({
        ...base,
        extra_field: 1,
      }),
    ).toThrow();
  });

  it("maps toContactInsert with nullables", () => {
    const values = contactSchema.parse({
      ...base,
      email: "a@b.de",
      company_id: COMPANY_UUID,
    });
    const row = toContactInsert(values);
    expect(row.email).toBe("a@b.de");
    expect(row.company_id).toBe(COMPANY_UUID);
  });
});

describe("reminderSchema", () => {
  const future = isoDaysFromNow(14);

  it("accepts a reminder with future due_date", () => {
    const parsed = reminderSchema.parse({
      title: "Follow up",
      company_id: COMPANY_UUID,
      due_date: future,
    });
    expect(parsed.title).toBe("Follow up");
    expect(parsed.company_id).toBe(COMPANY_UUID);
  });

  it("rejects past due_date", () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    expect(() =>
      reminderSchema.parse({
        title: "Late",
        company_id: "x",
        due_date: past,
      }),
    ).toThrow();
  });

  it("requires non-empty company_id", () => {
    expect(() =>
      reminderSchema.parse({
        title: "T",
        company_id: "",
        due_date: future,
      }),
    ).toThrow();
  });

  it("allows assigned_to null", () => {
    const parsed = reminderSchema.parse({
      title: "T",
      company_id: "any-company-ref",
      due_date: future,
      assigned_to: null,
    });
    expect(parsed.assigned_to).toBeNull();
  });
});

describe("reminderFormSchema", () => {
  const futureDate = isoDaysFromNow(30);

  const base = {
    title: "Quarterly review",
    due_date: futureDate,
    company_id: COMPANY_UUID,
  };

  it("accepts a full valid form", () => {
    const parsed = reminderFormSchema.parse({
      ...base,
      description: "Notes",
      priority: "hoch" as const,
      status: "open" as const,
      assigned_to: USER_UUID,
    });
    expect(parsed.title).toBe("Quarterly review");
    expect(parsed.priority).toBe("hoch");
    expect(parsed.status).toBe("open");
    expect(parsed.due_date).toBeInstanceOf(Date);
    expect(parsed.due_date.getTime()).toBe(new Date(futureDate).getTime());
  });

  it("trims title and enforces min length", () => {
    const parsed = reminderFormSchema.parse({
      ...base,
      title: "  abc  ",
    });
    expect(parsed.title).toBe("abc");
    expect(() => reminderFormSchema.parse({ ...base, title: "ab" })).toThrow();
  });

  it("allows nullable optional priority and status omitted", () => {
    const parsed = reminderFormSchema.parse({
      ...base,
      priority: null,
      status: null,
    });
    expect(parsed.priority).toBeNull();
    expect(parsed.status).toBeNull();
  });

  test.each(["hoch", "normal", "niedrig"] as const)("accepts priority %s", (priority) => {
    const parsed = reminderFormSchema.parse({ ...base, priority });
    expect(parsed.priority).toBe(priority);
  });

  it("rejects invalid priority", () => {
    expect(() =>
      reminderFormSchema.parse({
        ...base,
        priority: "urgent",
      }),
    ).toThrow();
  });

  it("rejects invalid company_id uuid", () => {
    expect(() =>
      reminderFormSchema.parse({
        ...base,
        company_id: "not-a-uuid",
      }),
    ).toThrow();
  });

  it("allows assigned_to null", () => {
    const parsed = reminderFormSchema.parse({ ...base, assigned_to: null });
    expect(parsed.assigned_to).toBeNull();
  });

  it("rejects unknown keys in strict mode", () => {
    expect(() =>
      reminderFormSchema.parse({
        ...base,
        legacyId: 1,
      }),
    ).toThrow();
  });

  it("rejects due_date in the past", () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    expect(() => reminderFormSchema.parse({ ...base, due_date: past })).toThrow();
  });
});

describe("timelineSchema", () => {
  const base = {
    title: "Customer call",
    activity_type: "call" as const,
  };

  it("accepts minimal timeline entry", () => {
    const parsed = timelineSchema.parse(base);
    expect(parsed.title).toBe("Customer call");
    expect(parsed.activity_type).toBe("call");
  });

  it("trims title", () => {
    const parsed = timelineSchema.parse({
      title: "  padded title  ",
      activity_type: "note",
    });
    expect(parsed.title).toBe("padded title");
  });

  test.each(["note", "call", "email", "meeting", "reminder", "other"] as const)("accepts activity_type %s", (activity_type) => {
    const parsed = timelineSchema.parse({ title: "Titel lang genug", activity_type });
    expect(parsed.activity_type).toBe(activity_type);
  });

  it("allows nullable content", () => {
    const parsed = timelineSchema.parse({
      ...base,
      content: null,
    });
    expect(parsed.content).toBeNull();
  });

  it("rejects title shorter than 3 chars", () => {
    expect(() => timelineSchema.parse({ title: "ab", activity_type: "note" })).toThrow();
  });

  it("rejects invalid optional company_id", () => {
    expect(() =>
      timelineSchema.parse({
        ...base,
        company_id: "bad",
      }),
    ).toThrow();
  });

  it("maps toTimelineInsert", () => {
    const values = timelineSchema.parse({
      ...base,
      company_id: COMPANY_UUID,
      content: null,
    });
    const row = toTimelineInsert(values);
    expect(row.company_id).toBe(COMPANY_UUID);
    expect(row.content).toBeNull();
  });

  it("rejects unknown keys in strict mode", () => {
    expect(() =>
      timelineSchema.parse({
        ...base,
        foo: "bar",
      }),
    ).toThrow();
  });
});
