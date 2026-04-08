/**
 * Tests for {@link ./email.ts}: mass-email helpers `fillPlaceholders`, `isValidEmail`, `hasMXRecords`,
 * and `getMassEmailRecipients` (Supabase client mocked).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fillPlaceholders, getMassEmailRecipients, hasMXRecords, isValidEmail } from "@/lib/services/email";

const mockResolveMx = vi.hoisted(() => vi.fn());

vi.mock("node:dns", () => ({
  promises: {
    resolveMx: (...args: unknown[]) => mockResolveMx(...args),
  },
}));

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
});
