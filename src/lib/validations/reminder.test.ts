import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  reminderFormSchema,
  reminderSchema,
  toReminderInsert,
  toReminderUpdate,
} from "./reminder";

const companyId = "123e4567-e89b-12d3-a456-426614174000";

describe("reminderSchema (legacy)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts future due date", () => {
    const out = reminderSchema.parse({
      title: "T",
      company_id: companyId,
      due_date: "2026-12-01T00:00:00.000Z",
    });
    expect(out.title).toBe("T");
  });

  it("rejects past due date", () => {
    expect(() =>
      reminderSchema.parse({
        title: "T",
        company_id: companyId,
        due_date: "2020-01-01T00:00:00.000Z",
      }),
    ).toThrow(/future/);
  });
});

describe("reminderFormSchema", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const validBase = {
    title: "Call client",
    due_date: "2026-06-15",
    company_id: companyId,
    priority: "hoch" as const,
    status: "open" as const,
  };

  it("parses strict form", () => {
    const out = reminderFormSchema.parse(validBase);
    expect(out.title).toBe("Call client");
  });

  it("rejects short title", () => {
    expect(() => reminderFormSchema.parse({ ...validBase, title: "ab" })).toThrow();
  });

  it("rejects invalid company uuid", () => {
    expect(() => reminderFormSchema.parse({ ...validBase, company_id: "nope" })).toThrow();
  });

  it("rejects invalid due_date string before future refine", () => {
    expect(() => reminderFormSchema.parse({ ...validBase, due_date: "not-a-date" })).toThrow(/Ungültiges Datum/);
  });

  it("rejects due date in the past", () => {
    expect(() => reminderFormSchema.parse({ ...validBase, due_date: "2020-01-01" })).toThrow(/Zukunft/);
  });

  it("rejects invalid assigned_to uuid when provided", () => {
    expect(() =>
      reminderFormSchema.parse({
        ...validBase,
        assigned_to: "not-a-uuid",
      }),
    ).toThrow(/Benutzer-ID/);
  });

  it("accepts null description and omits optional priority and status", () => {
    const out = reminderFormSchema.parse({
      title: validBase.title,
      due_date: validBase.due_date,
      company_id: validBase.company_id,
      description: null,
    });
    expect(out.description).toBeNull();
    expect(out.priority).toBeUndefined();
    expect(out.status).toBeUndefined();
  });
});

describe("toReminderInsert / toReminderUpdate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("maps to insert/update shapes", () => {
    const v = reminderSchema.parse({
      title: "T",
      company_id: companyId,
      due_date: "2026-08-01T00:00:00.000Z",
      description: "d",
    });
    expect(toReminderInsert(v).due_date).toContain("2026");
    expect(toReminderUpdate(v).description).toBe("d");
  });

  it("maps omitted description and assigned_to to null on update", () => {
    const v = reminderSchema.parse({
      title: "Task",
      company_id: companyId,
      due_date: "2026-08-01T00:00:00.000Z",
    });
    const row = toReminderUpdate(v);
    expect(row.description).toBeNull();
    expect(row.assigned_to).toBeNull();
  });
});
