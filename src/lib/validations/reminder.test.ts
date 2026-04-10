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
});
