import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CompanyFormValues } from "@/lib/validations/company";

const generateAndStoreCompanyEmbedding = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("@/lib/services/semantic-search", () => ({
  generateAndStoreCompanyEmbedding,
}));

const getCurrentUser = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/get-current-user", () => ({
  getCurrentUser,
}));

const createServerSupabaseClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient,
}));

describe("createCompany", () => {
  /** `handleSupabaseError` logs via console.group/error; keep expected-error cases quiet. */
  const groupSpy = vi.spyOn(console, "group").mockImplementation(() => undefined);
  const groupEndSpy = vi.spyOn(console, "groupEnd").mockImplementation(() => undefined);
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    groupSpy.mockClear();
    groupEndSpy.mockClear();
    errorSpy.mockClear();
  });

  it("throws when Zod validation fails", async () => {
    getCurrentUser.mockResolvedValue({ id: "u1" } as never);
    const { createCompany } = await import("@/lib/actions/companies");
    const invalid: CompanyFormValues = {
      firmenname: "",
      kundentyp: "sonstige",
      status: "lead",
    };
    await expect(createCompany(invalid)).rejects.toThrow("Validierungsfehler beim Erstellen des Unternehmens");
  });

  it("throws when unauthenticated", async () => {
    getCurrentUser.mockResolvedValue(null);
    const { createCompany } = await import("@/lib/actions/companies");
    const values: CompanyFormValues = {
      firmenname: "Acme GmbH",
      kundentyp: "sonstige",
      status: "lead",
    };
    await expect(createCompany(values)).rejects.toThrow("Unauthorized");
  });

  it("inserts with user_id and triggers embedding generation", async () => {
    const USER_ID = "10000000-0000-4000-8000-000000000099";
    getCurrentUser.mockResolvedValue({ id: USER_ID } as never);
    const inserted = {
      id: "20000000-0000-4000-8000-000000000088",
      firmenname: "Acme GmbH",
      kundentyp: "sonstige",
      status: "lead",
      user_id: USER_ID,
    };
    const single = vi.fn().mockResolvedValue({ data: inserted, error: null });
    createServerSupabaseClient.mockResolvedValue({
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single,
          })),
        })),
      })),
    } as never);

    const { createCompany } = await import("@/lib/actions/companies");
    const values: CompanyFormValues = {
      firmenname: "Acme GmbH",
      kundentyp: "sonstige",
      status: "lead",
    };
    const result = await createCompany(values);

    expect(result).toEqual(inserted);
    expect(single).toHaveBeenCalled();
    expect(generateAndStoreCompanyEmbedding).toHaveBeenCalledWith(
      expect.anything(),
      inserted.id,
      expect.anything(),
    );
  });

  it("throws when Supabase insert fails", async () => {
    getCurrentUser.mockResolvedValue({ id: "u1" } as never);
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "duplicate key" },
    });
    createServerSupabaseClient.mockResolvedValue({
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single,
          })),
        })),
      })),
    } as never);

    const { createCompany } = await import("@/lib/actions/companies");
    await expect(
      createCompany({
        firmenname: "Dup GmbH",
        kundentyp: "sonstige",
        status: "lead",
      }),
    ).rejects.toThrow();
  });
});
