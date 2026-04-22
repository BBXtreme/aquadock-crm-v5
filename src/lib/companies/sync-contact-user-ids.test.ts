import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { syncContactUserIdsForCompany } from "@/lib/companies/sync-contact-user-ids";

describe("syncContactUserIdsForCompany", () => {
  it("runs contacts update scoped to company_id and active rows", async () => {
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        is: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
    const client = {
      from: vi.fn(() => ({ update })),
    } as unknown as SupabaseClient;

    await syncContactUserIdsForCompany(client, "company-1", "owner-1", "actor-1");

    expect(client.from).toHaveBeenCalledWith("contacts");
    expect(update).toHaveBeenCalledWith({ user_id: "owner-1", updated_by: "actor-1" });
    const chain = update.mock.results[0]?.value as { eq: ReturnType<typeof vi.fn> };
    expect(chain.eq).toHaveBeenCalledWith("company_id", "company-1");
    const eqChain = chain.eq.mock.results[0]?.value as { is: ReturnType<typeof vi.fn> };
    expect(eqChain.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("throws when Supabase returns error", async () => {
    const client = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn().mockResolvedValue({ error: { message: "rls" } }),
          })),
        })),
      })),
    } as unknown as SupabaseClient;

    await expect(syncContactUserIdsForCompany(client, "c", "o", "a")).rejects.toThrow();
  });
});
