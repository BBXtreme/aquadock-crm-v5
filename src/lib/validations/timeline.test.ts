/**
 * Tests for {@link ./timeline.ts}: `timelineSchema` (Zod single source of truth) and `toTimelineInsert`.
 * Product export name is `timelineSchema` (not `timelineEntrySchema`).
 */

import { describe, expect, it, test } from "vitest";
import {
  coerceActivityTypeForInsert,
  matchesImportActivityText,
  normalizeTimelineBadgeActivityType,
  resolveActivityTypeForTimelinePersist,
  timelineSchema,
  toTimelineInsert,
} from "@/lib/validations/timeline";

const COMPANY_UUID = "550e8400-e29b-41d4-a716-446655440000";
const CONTACT_UUID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

describe("timelineSchema", () => {
  const minimal = {
    title: "Follow-up nach Angebot",
    activity_type: "email" as const,
  };

  it("accepts minimal valid entry with only title and activity_type", () => {
    const parsed = timelineSchema.parse(minimal);
    expect(parsed.title).toBe("Follow-up nach Angebot");
    expect(parsed.activity_type).toBe("email");
    expect(parsed.company_id).toBeUndefined();
    expect(parsed.contact_id).toBeUndefined();
  });

  it("accepts entry with company_id and optional contact_id", () => {
    const parsed = timelineSchema.parse({
      ...minimal,
      company_id: COMPANY_UUID,
      contact_id: CONTACT_UUID,
      user_name: "Erika Muster",
    });
    expect(parsed.company_id).toBe(COMPANY_UUID);
    expect(parsed.contact_id).toBe(CONTACT_UUID);
    expect(parsed.user_name).toBe("Erika Muster");
  });

  it("trims title", () => {
    const parsed = timelineSchema.parse({
      title: "  Meeting Notes  ",
      activity_type: "meeting",
    });
    expect(parsed.title).toBe("Meeting Notes");
  });

  it("rejects title shorter than 3 characters after trim", () => {
    expect(() => timelineSchema.parse({ title: "ab", activity_type: "other" })).toThrow();
  });

  it("allows whitespace-only title when raw length meets min(3) before trim (schema order: min then trim)", () => {
    const parsed = timelineSchema.parse({ title: "   ", activity_type: "other" });
    expect(parsed.title).toBe("");
  });

  it("rejects title longer than 200 characters", () => {
    const longTitle = "x".repeat(201);
    expect(() => timelineSchema.parse({ title: longTitle, activity_type: "other" })).toThrow();
  });

  test.each(["call", "email", "meeting", "other", "import"] as const)("accepts activity_type %s", (activity_type) => {
    const parsed = timelineSchema.parse({ title: "Genügend lang", activity_type });
    expect(parsed.activity_type).toBe(activity_type);
  });

  it("rejects legacy 'note' activity_type (removed from manual entry — use company comments or other types)", () => {
    const result = timelineSchema.safeParse({ title: "Follow up call", activity_type: "note" });
    expect(result.success).toBe(false);
  });

  it("rejects legacy 'reminder' activity_type (now removed — reminders live on a dedicated page)", () => {
    const result = timelineSchema.safeParse({ title: "Follow up call", activity_type: "reminder" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid activity_type enum values", () => {
    const result = timelineSchema.safeParse({ title: "Valid length title", activity_type: "visit" });
    expect(result.success).toBe(false);
  });

  it("allows nullable content and omits content when undefined", () => {
    const withNull = timelineSchema.parse({ ...minimal, content: null });
    expect(withNull.content).toBeNull();

    const without = timelineSchema.parse(minimal);
    expect(without.content).toBeUndefined();
  });

  it("rejects content longer than 2000 characters", () => {
    expect(() =>
      timelineSchema.parse({
        title: "OK title here",
        activity_type: "other",
        content: "y".repeat(2001),
      }),
    ).toThrow();
  });

  it("rejects invalid company_id UUID", () => {
    expect(() =>
      timelineSchema.parse({
        ...minimal,
        company_id: "not-a-uuid",
      }),
    ).toThrow();
  });

  it("rejects invalid contact_id UUID", () => {
    expect(() =>
      timelineSchema.parse({
        ...minimal,
        contact_id: "bad",
      }),
    ).toThrow();
  });

  it("allows null company_id and contact_id", () => {
    const parsed = timelineSchema.parse({
      ...minimal,
      company_id: null,
      contact_id: null,
    });
    expect(parsed.company_id).toBeNull();
    expect(parsed.contact_id).toBeNull();
  });

  it("rejects unknown keys under .strict()", () => {
    expect(() =>
      timelineSchema.parse({
        ...minimal,
        extra_field: 1,
      }),
    ).toThrow();
  });

  it("accepts special characters and unicode in title and content", () => {
    const parsed = timelineSchema.parse({
      title: "Anruf: Café «Zur Brücke» — 50% off?",
      activity_type: "call",
      content: "Kunde erwähnt François & Co. Preis: 1.234,56 €",
    });
    expect(parsed.title).toContain("Café");
    expect(parsed.content).toContain("François");
  });
});

describe("toTimelineInsert", () => {
  it("maps nullables to null for Supabase insert", () => {
    const values = timelineSchema.parse({
      title: "Log entry",
      activity_type: "other",
      content: null,
      company_id: COMPANY_UUID,
      contact_id: null,
      user_name: "System",
    });
    const row = toTimelineInsert(values);
    expect(row.title).toBe("Log entry");
    expect(row.activity_type).toBe("other");
    expect(row.content).toBeNull();
    expect(row.company_id).toBe(COMPANY_UUID);
    expect(row.contact_id).toBeNull();
    expect(row.user_name).toBe("System");
  });

  it("maps omitted company_id and contact_id to null in insert shape", () => {
    const values = timelineSchema.parse({
      title: "Internal note",
      activity_type: "other",
    });
    const row = toTimelineInsert(values);
    expect(row.company_id).toBeNull();
    expect(row.contact_id).toBeNull();
    expect(row.content).toBeNull();
  });

  it("preserves non-null content through insert mapping", () => {
    const values = timelineSchema.parse({
      title: "Email sent",
      activity_type: "email",
      content: "Betreff: Angebot",
    });
    const row = toTimelineInsert(values);
    expect(row.content).toBe("Betreff: Angebot");
  });

  it("maps empty string content to null", () => {
    const values = timelineSchema.parse({
      title: "Enough length for schema",
      activity_type: "other",
      content: "",
    });
    expect(toTimelineInsert(values).content).toBeNull();
  });
});

describe("coerceActivityTypeForInsert", () => {
  it("maps note and empty values to other", () => {
    expect(coerceActivityTypeForInsert("note")).toBe("other");
    expect(coerceActivityTypeForInsert("")).toBe("other");
    expect(coerceActivityTypeForInsert(undefined)).toBe("other");
    expect(coerceActivityTypeForInsert(null)).toBe("other");
  });

  it("preserves valid manual types", () => {
    expect(coerceActivityTypeForInsert("call")).toBe("call");
    expect(coerceActivityTypeForInsert("email")).toBe("email");
    expect(coerceActivityTypeForInsert("meeting")).toBe("meeting");
    expect(coerceActivityTypeForInsert("other")).toBe("other");
    expect(coerceActivityTypeForInsert("import")).toBe("import");
  });

  it("maps legacy csv_import to import", () => {
    expect(coerceActivityTypeForInsert("csv_import")).toBe("import");
  });
});

describe("matchesImportActivityText", () => {
  it("detects CSV import phrasing", () => {
    expect(matchesImportActivityText("CSV Import abgeschlossen", null)).toBe(true);
    expect(matchesImportActivityText("Log", "Daten per CSV importiert")).toBe(true);
  });

  it("detects OpenMap / OSM import phrasing", () => {
    expect(matchesImportActivityText("OpenMap import", "")).toBe(true);
    expect(matchesImportActivityText("Notiz", "Aus OpenStreetMap importiert")).toBe(true);
  });

  it("returns false without import context", () => {
    expect(matchesImportActivityText("CSV-Datei prüfen", null)).toBe(false);
    expect(matchesImportActivityText("Meeting", "Karte anzeigen")).toBe(false);
  });
});

describe("resolveActivityTypeForTimelinePersist", () => {
  it("upgrades other to import when text matches", () => {
    expect(resolveActivityTypeForTimelinePersist("other", "CSV import done", null)).toBe("import");
  });

  it("leaves other when no import cues", () => {
    expect(resolveActivityTypeForTimelinePersist("other", "Follow-up call", null)).toBe("other");
  });
});

describe("normalizeTimelineBadgeActivityType", () => {
  it("maps csv_import and import to import", () => {
    expect(normalizeTimelineBadgeActivityType("csv_import", "", null)).toBe("import");
    expect(normalizeTimelineBadgeActivityType("import", "x", null)).toBe("import");
  });

  it("maps other with import-like text to import", () => {
    expect(normalizeTimelineBadgeActivityType("other", "CSV import", null)).toBe("import");
  });

  it("returns other and call unchanged when not import-like", () => {
    expect(normalizeTimelineBadgeActivityType("other", "Meeting notes", null)).toBe("other");
    expect(normalizeTimelineBadgeActivityType("call", "x", null)).toBe("call");
  });

  it("does not upgrade non-other types even when title looks like import", () => {
    expect(normalizeTimelineBadgeActivityType("meeting", "CSV import notes", null)).toBe("meeting");
  });

  it("treats undefined title like empty string for import detection", () => {
    expect(normalizeTimelineBadgeActivityType("other", undefined, "OpenMap import")).toBe("import");
  });
});
