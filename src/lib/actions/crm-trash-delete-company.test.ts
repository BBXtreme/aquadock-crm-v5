import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/require-user", () => ({
  requireUser,
}));

const fetchTrashBinPreference = vi.hoisted(() => vi.fn());
vi.mock("@/lib/services/user-settings", () => ({
  fetchTrashBinPreference,
}));

const logTrashAuditEvent = vi.hoisted(() => vi.fn());
vi.mock("@/lib/server/delete-audit", () => ({
  logTrashAuditEvent,
}));

const createServerSupabaseClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient,
}));

const USER_ID = "10000000-0000-4000-8000-000000000001";
const COMPANY_ID = "20000000-0000-4000-8000-000000000001";

type ActiveRow = { id: string; deleted_at: null };

function buildSupabaseForSoftDelete(options: { activeRow: ActiveRow | null }) {
  let companiesCall = 0;
  return {
    from: vi.fn((table: string) => {
      if (table === "companies") {
        companiesCall += 1;
        if (companiesCall === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { firmenname: "Acme GmbH" },
              error: null,
            }),
          };
        }
        if (companiesCall === 2) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: options.activeRow,
              error: null,
            }),
          };
        }
        if (companiesCall === 3) {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        throw new Error(`unexpected companies from() call #${companiesCall}`);
      }
      if (table === "contacts") {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === "reminders") {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    }),
  };
}

describe("crm-trash deleteCompanyWithTrash", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ id: USER_ID } as never);
    fetchTrashBinPreference.mockResolvedValue({ trashBinEnabled: true } as never);
    logTrashAuditEvent.mockResolvedValue(undefined);
  });

  it("soft-deletes when trash bin is enabled", async () => {
    const supabase = buildSupabaseForSoftDelete({
      activeRow: { id: COMPANY_ID, deleted_at: null },
    });
    createServerSupabaseClient.mockResolvedValue(supabase as never);

    const { deleteCompanyWithTrash } = await import("@/lib/actions/crm-trash");
    await expect(deleteCompanyWithTrash(COMPANY_ID)).resolves.toBe("soft");

    expect(logTrashAuditEvent).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        entity: "company",
        operation: "soft_delete",
        entityId: COMPANY_ID,
      }),
    );
  });

  it("throws a German message when no active company row (not found or already trashed)", async () => {
    const supabase = buildSupabaseForSoftDelete({ activeRow: null });
    createServerSupabaseClient.mockResolvedValue(supabase as never);

    const { deleteCompanyWithTrash } = await import("@/lib/actions/crm-trash");
    await expect(deleteCompanyWithTrash(COMPANY_ID)).rejects.toThrow(
      "Unternehmen nicht gefunden oder bereits im Papierkorb",
    );
    expect(logTrashAuditEvent).not.toHaveBeenCalled();
  });

  it("propagates when requireUser fails (auth gate)", async () => {
    requireUser.mockRejectedValueOnce(new Error("Unauthorized") as never);
    createServerSupabaseClient.mockResolvedValue({ from: vi.fn() } as never);

    const { deleteCompanyWithTrash } = await import("@/lib/actions/crm-trash");
    await expect(deleteCompanyWithTrash(COMPANY_ID)).rejects.toThrow("Unauthorized");
  });
});
