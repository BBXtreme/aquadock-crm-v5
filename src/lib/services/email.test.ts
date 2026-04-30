/**
 * Tests for {@link ./email.ts}: mass-email helpers `fillPlaceholders`, `isValidEmail`, and
 * `getMassEmailRecipients` (Supabase client mocked). MX checks: {@link ./email-mx.ts}.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createEmailLog,
  createEmailTemplate,
  deleteEmailLog,
  deleteEmailTemplate,
  fillPlaceholders,
  getEmailLogById,
  getEmailLogs,
  getEmailTemplateById,
  getEmailTemplates,
  getMassEmailRecipients,
  isValidEmail,
  updateEmailLog,
  updateEmailTemplate,
} from "@/lib/services/email";
import { hasMXRecords } from "@/lib/services/email-mx";

const mockResolveMx = vi.hoisted(() => vi.fn());

vi.mock("node:dns", () => {
  const promises = {
    resolveMx: (...args: unknown[]) => mockResolveMx(...args),
  };
  return {
    __esModule: true,
    default: { promises },
    promises,
  };
});

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "group").mockImplementation(() => undefined);
  vi.spyOn(console, "groupEnd").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.mocked(console.error).mockRestore();
  vi.mocked(console.group).mockRestore();
  vi.mocked(console.groupEnd).mockRestore();
});

describe("fillPlaceholders", () => {
  const fullRecipient = {
    name: "Herr Max Mustermann",
    anrede: "Herr",
    vorname: "Max",
    nachname: "Mustermann",
    firmenname: "Nordsee Marina AG",
    stadt: "Hamburg",
  };

  it("replaces all known placeholders case-insensitively", () => {
    const template =
      "{{anrede}} {{vorname}} / {{ANREDE}} — {{firmenname}}, {{stadt}} ({{nachname}}) / {{NAME}}";
    const out = fillPlaceholders(template, fullRecipient);
    expect(out).toBe(
      "Herr Max / Herr — Nordsee Marina AG, Hamburg (Mustermann) / Herr Max Mustermann",
    );
  });

  it("leaves unknown placeholders unchanged", () => {
    const text = "Hello {{vorname}}, code {{promo_code}} end";
    expect(fillPlaceholders(text, { name: "X", vorname: "Ann" })).toBe("Hello Ann, code {{promo_code}} end");
  });

  it("uses empty string for missing optional fields", () => {
    const text = "A{{anrede}}B{{vorname}}C{{nachname}}D{{firmenname}}E{{stadt}}F";
    expect(fillPlaceholders(text, { name: "Solo" })).toBe("ABCDEF");
  });

  it("handles empty strings on recipient fields", () => {
    expect(fillPlaceholders("{{vorname}}{{nachname}}", { name: "N", vorname: "", nachname: "" })).toBe("");
  });

  it("preserves HTML in template and replacement values", () => {
    const html =
      "<p>Hallo {{vorname}}</p><br/><a href=\"x\">{{firmenname}}</a><script>{{unknown}}</script>";
    const out = fillPlaceholders(html, {
      name: "N",
      vorname: "<b>Rich</b>",
      firmenname: "Co &amp; Sons",
    });
    expect(out).toContain("<p>Hallo <b>Rich</b></p>");
    expect(out).toContain("Co &amp; Sons");
    expect(out).toContain("{{unknown}}");
  });

  it("handles special characters and unicode in names", () => {
    const r = {
      name: "Françoise Müller-Smith",
      vorname: "Françoise",
      nachname: "Müller-Smith",
      firmenname: "Café \"Zur Post\"",
      stadt: "München",
      anrede: "Frau",
    };
    const out = fillPlaceholders("{{vorname}} @ {{firmenname}} — {{stadt}}", r);
    expect(out).toBe("Françoise @ Café \"Zur Post\" — München");
  });

  it("replaces {{name}} with literal recipient.name including when other fields missing", () => {
    expect(fillPlaceholders("Dear {{name}}", { name: "Team Lead" })).toBe("Dear Team Lead");
  });
});

describe("isValidEmail", () => {
  it("accepts common valid addresses", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("user.name+tag@example.com")).toBe(true);
  });

  it("rejects empty, non-string, and whitespace-only", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("   ")).toBe(false);
    expect(isValidEmail("not-an-email")).toBe(false);
  });

  it("rejects malformed domains", () => {
    expect(isValidEmail("x@y..z.com")).toBe(false);
    expect(isValidEmail("x@.invalid.com")).toBe(false);
    expect(isValidEmail("x@invalid.")).toBe(false);
  });

  it("rejects non-string values at runtime", () => {
    expect(isValidEmail(null as unknown as string)).toBe(false);
    expect(isValidEmail(undefined as unknown as string)).toBe(false);
    expect(isValidEmail(0 as unknown as string)).toBe(false);
  });
});

describe("hasMXRecords", () => {
  beforeEach(() => {
    mockResolveMx.mockReset();
  });

  it("returns true when MX records exist", async () => {
    mockResolveMx.mockResolvedValue([{ exchange: "mx.example.com", priority: 10 }]);

    await expect(hasMXRecords("example.com")).resolves.toBe(true);
    expect(mockResolveMx).toHaveBeenCalledWith("example.com");
  });

  it("returns false when resolveMx throws", async () => {
    mockResolveMx.mockRejectedValue(new Error("ENOTFOUND"));

    await expect(hasMXRecords("missing.invalid")).resolves.toBe(false);
  });

  it("returns false when MX list is empty", async () => {
    mockResolveMx.mockResolvedValue([]);

    await expect(hasMXRecords("noop.test")).resolves.toBe(false);
  });

  it("returns false when resolveMx resolves to a falsy value", async () => {
    mockResolveMx.mockResolvedValue(null as unknown as never);

    await expect(hasMXRecords("null-mx.test")).resolves.toBe(false);
  });
});

describe("getMassEmailRecipients", () => {
  function createContactsQueryMock(rows: unknown[], error: unknown = null) {
    const builder = {
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: rows, error }),
    };
    return builder;
  }

  function createCompaniesQueryMock(rows: unknown[], error: unknown = null) {
    const builder = {
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: rows, error }),
    };
    return builder;
  }

  it("maps contacts with anrede, vorname, nachname and joined company", async () => {
    const contactsBuilder = createContactsQueryMock([
      {
        id: "c1",
        vorname: "Max",
        nachname: "Mustermann",
        anrede: "Herr",
        email: "max@example.com",
        companies: { id: "co1", firmenname: "ACME GmbH" },
      },
    ]);

    const client = {
      from: vi.fn((table: string) => {
        if (table === "contacts") {
          return contactsBuilder;
        }
        throw new Error(`unexpected table ${table}`);
      }),
    } as unknown as SupabaseClient;

    const recipients = await getMassEmailRecipients(client, { mode: "contacts" });

    expect(recipients).toHaveLength(1);
    const first = recipients[0];
    if (first === undefined) {
      throw new Error("expected one recipient");
    }
    expect(first.name).toBe("Herr Max Mustermann");
    expect(first.email).toBe("max@example.com");
    expect(first.firmenname).toBe("ACME GmbH");
    expect(first.company_id).toBe("co1");
  });

  it("uses Unbekannt when contact name parts are all empty", async () => {
    const contactsBuilder = createContactsQueryMock([
      {
        id: "c2",
        vorname: null,
        nachname: null,
        anrede: null,
        email: "ghost@example.com",
        companies: { id: "co2", firmenname: "Solo GmbH" },
      },
    ]);

    const client = {
      from: vi.fn(() => contactsBuilder),
    } as unknown as SupabaseClient;

    const recipients = await getMassEmailRecipients(client, { mode: "contacts" });
    const first = recipients[0];
    if (first === undefined) {
      throw new Error("expected one recipient");
    }
    expect(first.name).toBe("Unbekannt");
  });

  it("builds contact display name from vorname only when anrede and nachname are null", async () => {
    const contactsBuilder = createContactsQueryMock([
      {
        id: "c3",
        vorname: "Solo",
        nachname: null,
        anrede: null,
        email: "solo@example.com",
        companies: { id: "co3", firmenname: "Co" },
      },
    ]);

    const client = {
      from: vi.fn(() => contactsBuilder),
    } as unknown as SupabaseClient;

    const recipients = await getMassEmailRecipients(client, { mode: "contacts" });
    const first = recipients[0];
    if (first === undefined) {
      throw new Error("expected one recipient");
    }
    expect(first.name).toBe("Solo");
  });

  it("sanitizes commas in contact search before building or()", async () => {
    const contactsBuilder = createContactsQueryMock([]);

    const client = {
      from: vi.fn(() => contactsBuilder),
    } as unknown as SupabaseClient;

    await getMassEmailRecipients(client, { mode: "contacts", search: "a,b,c" });

    expect(contactsBuilder.or).toHaveBeenCalledWith(
      "vorname.ilike.%a b c%,nachname.ilike.%a b c%,email.ilike.%a b c%",
    );
  });

  it("uses default limit 500 for contacts when limit omitted", async () => {
    const contactsBuilder = createContactsQueryMock([]);
    const client = {
      from: vi.fn(() => contactsBuilder),
    } as unknown as SupabaseClient;

    await getMassEmailRecipients(client, { mode: "contacts" });
    expect(contactsBuilder.limit).toHaveBeenCalledWith(500);
  });

  it("passes custom limit for contacts mode", async () => {
    const contactsBuilder = createContactsQueryMock([]);
    const client = {
      from: vi.fn(() => contactsBuilder),
    } as unknown as SupabaseClient;

    await getMassEmailRecipients(client, { mode: "contacts", limit: 42 });
    expect(contactsBuilder.limit).toHaveBeenCalledWith(42);
  });

  it("passes custom limit for companies mode", async () => {
    const companiesBuilder = createCompaniesQueryMock([]);
    const client = {
      from: vi.fn((table: string) => {
        if (table === "companies") {
          return companiesBuilder;
        }
        throw new Error(`unexpected ${table}`);
      }),
    } as unknown as SupabaseClient;

    await getMassEmailRecipients(client, { mode: "companies", limit: 7 });
    expect(companiesBuilder.limit).toHaveBeenCalledWith(7);
  });

  it("maps companies mode to firmenname as name and email", async () => {
    const companiesBuilder = createCompaniesQueryMock([
      { id: "co1", firmenname: "Beta AG", email: "info@beta.de" },
    ]);

    const client = {
      from: vi.fn((table: string) => {
        if (table === "companies") {
          return companiesBuilder;
        }
        throw new Error(`unexpected table ${table}`);
      }),
    } as unknown as SupabaseClient;

    const recipients = await getMassEmailRecipients(client, { mode: "companies" });

    expect(recipients).toHaveLength(1);
    const first = recipients[0];
    if (first === undefined) {
      throw new Error("expected one recipient");
    }
    expect(first.name).toBe("Beta AG");
    expect(first.email).toBe("info@beta.de");
    expect(first.firmenname).toBe("Beta AG");
    expect(first.company_id).toBeUndefined();
  });

  it("returns empty array when contacts query returns no rows", async () => {
    const contactsBuilder = createContactsQueryMock([]);

    const client = {
      from: vi.fn(() => contactsBuilder),
    } as unknown as SupabaseClient;

    const recipients = await getMassEmailRecipients(client, { mode: "contacts" });
    expect(recipients).toEqual([]);
  });

  it("applies status, kundentyp, land filters in contacts mode", async () => {
    const contactsBuilder = createContactsQueryMock([]);
    const client = {
      from: vi.fn(() => contactsBuilder),
    } as unknown as SupabaseClient;

    await getMassEmailRecipients(client, {
      mode: "contacts",
      status: "lead",
      kundentyp: "marina",
      land: "DE",
    });

    expect(contactsBuilder.eq).toHaveBeenCalled();
  });

  it("throws when contacts query returns error", async () => {
    const contactsBuilder = createContactsQueryMock([], { message: "db" });
    const client = {
      from: vi.fn(() => contactsBuilder),
    } as unknown as SupabaseClient;

    await expect(getMassEmailRecipients(client, { mode: "contacts" })).rejects.toThrow();
  });

  it("throws when companies query returns error", async () => {
    const companiesBuilder = createCompaniesQueryMock([], { message: "db" });
    const client = {
      from: vi.fn((table: string) => {
        if (table === "companies") {
          return companiesBuilder;
        }
        throw new Error(`unexpected ${table}`);
      }),
    } as unknown as SupabaseClient;

    await expect(getMassEmailRecipients(client, { mode: "companies" })).rejects.toThrow();
  });

  it("applies filters and search in companies mode", async () => {
    const companiesBuilder = createCompaniesQueryMock([]);
    const client = {
      from: vi.fn((table: string) => {
        if (table === "companies") {
          return companiesBuilder;
        }
        throw new Error(`unexpected ${table}`);
      }),
    } as unknown as SupabaseClient;

    await getMassEmailRecipients(client, {
      mode: "companies",
      status: "lead",
      kundentyp: "marina",
      land: "DE",
      search: "Beta",
    });

    expect(companiesBuilder.eq).toHaveBeenCalled();
    expect(companiesBuilder.ilike).toHaveBeenCalled();
  });

  it("returns empty companies list when Supabase returns null data without error", async () => {
    const companiesBuilder = {
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    const client = {
      from: vi.fn((table: string) => {
        if (table === "companies") {
          return companiesBuilder;
        }
        throw new Error(`unexpected table ${table}`);
      }),
    } as unknown as SupabaseClient;

    await expect(getMassEmailRecipients(client, { mode: "companies" })).resolves.toEqual([]);
  });
});

describe("email log / template CRUD", () => {
  it("getEmailLogs returns empty array when data is null without error", async () => {
    const builder = {
      select: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const client = { from: vi.fn(() => builder) } as unknown as SupabaseClient;
    await expect(getEmailLogs(client)).resolves.toEqual([]);
  });

  it("getEmailLogs returns rows", async () => {
    const rows = [{ id: "1" }];
    const builder = {
      select: vi.fn().mockResolvedValue({ data: rows, error: null }),
    };
    const client = { from: vi.fn(() => builder) } as unknown as SupabaseClient;
    await expect(getEmailLogs(client)).resolves.toEqual(rows);
  });

  it("getEmailLogs throws on error", async () => {
    const builder = {
      select: vi.fn().mockResolvedValue({ data: null, error: { message: "e" } }),
    };
    const client = { from: vi.fn(() => builder) } as unknown as SupabaseClient;
    await expect(getEmailLogs(client)).rejects.toThrow();
  });

  it("createEmailLog throws when insert returns error", async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { message: "insert failed" } });
    const client = {
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({ single })),
        })),
      })),
    } as unknown as SupabaseClient;
    await expect(createEmailLog({ subject: "s" } as never, client)).rejects.toThrow();
  });

  it("getEmailTemplates throws on error", async () => {
    const client = {
      from: vi.fn(() => ({
        select: vi.fn().mockResolvedValue({ data: null, error: { message: "e" } }),
      })),
    } as unknown as SupabaseClient;
    await expect(getEmailTemplates(client)).rejects.toThrow();
  });

  it("createEmailTemplate throws when insert returns error", async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { message: "bad" } });
    const client = {
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({ single })),
        })),
      })),
    } as unknown as SupabaseClient;
    await expect(createEmailTemplate({ name: "n" } as never, client)).rejects.toThrow();
  });

  it("getEmailLogById returns row", async () => {
    const row = { id: "a" };
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: row, error: null }),
        })),
      })),
    } as unknown as SupabaseClient;
    await expect(getEmailLogById("a", client)).resolves.toEqual(row);
  });

  it("getEmailLogById returns null when row is missing and error is absent", async () => {
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    } as unknown as SupabaseClient;
    await expect(getEmailLogById("missing", client)).resolves.toBeNull();
  });

  it("createEmailLog returns inserted row", async () => {
    const row = { id: "n" };
    const single = vi.fn().mockResolvedValue({ data: row, error: null });
    const client = {
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({ single })),
        })),
      })),
    } as unknown as SupabaseClient;
    await expect(createEmailLog({ subject: "s" } as never, client)).resolves.toEqual(row);
  });

  it("updateEmailLog returns updated row", async () => {
    const row = { id: "u" };
    const single = vi.fn().mockResolvedValue({ data: row, error: null });
    const client = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({ single })),
          })),
        })),
      })),
    } as unknown as SupabaseClient;
    await expect(updateEmailLog("u", { subject: "x" } as never, client)).resolves.toEqual(row);
  });

  it("deleteEmailLog resolves on success", async () => {
    const client = {
      from: vi.fn(() => ({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      })),
    } as unknown as SupabaseClient;
    await expect(deleteEmailLog("1", client)).resolves.toBeUndefined();
  });

  it("getEmailTemplates returns rows", async () => {
    const rows = [{ id: "t" }];
    const client = {
      from: vi.fn(() => ({
        select: vi.fn().mockResolvedValue({ data: rows, error: null }),
      })),
    } as unknown as SupabaseClient;
    await expect(getEmailTemplates(client)).resolves.toEqual(rows);
  });

  it("getEmailTemplates returns empty array when data is null without error", async () => {
    const client = {
      from: vi.fn(() => ({
        select: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    } as unknown as SupabaseClient;
    await expect(getEmailTemplates(client)).resolves.toEqual([]);
  });

  it("getEmailTemplateById returns row", async () => {
    const row = { id: "t1" };
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: row, error: null }),
        })),
      })),
    } as unknown as SupabaseClient;
    await expect(getEmailTemplateById("t1", client)).resolves.toEqual(row);
  });

  it("getEmailTemplateById returns null when row is missing and error is absent", async () => {
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    } as unknown as SupabaseClient;
    await expect(getEmailTemplateById("missing", client)).resolves.toBeNull();
  });

  it("createEmailTemplate returns inserted", async () => {
    const row = { id: "c" };
    const single = vi.fn().mockResolvedValue({ data: row, error: null });
    const client = {
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({ single })),
        })),
      })),
    } as unknown as SupabaseClient;
    await expect(createEmailTemplate({ name: "n" } as never, client)).resolves.toEqual(row);
  });

  it("updateEmailTemplate returns updated", async () => {
    const row = { id: "u" };
    const single = vi.fn().mockResolvedValue({ data: row, error: null });
    const client = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({ single })),
          })),
        })),
      })),
    } as unknown as SupabaseClient;
    await expect(updateEmailTemplate("u", { name: "x" } as never, client)).resolves.toEqual(row);
  });

  it("deleteEmailTemplate resolves", async () => {
    const client = {
      from: vi.fn(() => ({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      })),
    } as unknown as SupabaseClient;
    await expect(deleteEmailTemplate("1", client)).resolves.toBeUndefined();
  });

  it("propagates Supabase errors for read/update/delete paths", async () => {
    const errClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: { message: "missing" } }),
        })),
      })),
    } as unknown as SupabaseClient;
    await expect(getEmailLogById("x", errClient)).rejects.toThrow();
    await expect(getEmailTemplateById("x", errClient)).rejects.toThrow();

    const delFail = {
      from: vi.fn(() => ({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: { message: "no" } }),
        })),
      })),
    } as unknown as SupabaseClient;
    await expect(deleteEmailLog("1", delFail)).rejects.toThrow();
    await expect(deleteEmailTemplate("1", delFail)).rejects.toThrow();

    const updFail = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: "u" } }),
            })),
          })),
        })),
      })),
    } as unknown as SupabaseClient;
    await expect(updateEmailLog("1", {} as never, updFail)).rejects.toThrow();
    await expect(updateEmailTemplate("1", {} as never, updFail)).rejects.toThrow();
  });
});
