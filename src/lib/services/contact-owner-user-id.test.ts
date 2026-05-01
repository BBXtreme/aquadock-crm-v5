import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { resolveContactOwnerUserId } from "@/lib/services/contact-owner-user-id";
import { silenceHandleSupabaseErrorConsole } from "@/test/silence-handle-supabase-error-console";

const CURRENT = "10000000-0000-4000-8000-000000000001";
const OWNER = "10000000-0000-4000-8000-000000000002";
const COMPANY = "20000000-0000-4000-8000-000000000001";

function companiesClient(result: { data: unknown; error: unknown }) {
  return {
    from: vi.fn((table: string) => {
      expect(table).toBe("companies");
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(result),
      };
    }),
  } as unknown as SupabaseClient;
}

describe("resolveContactOwnerUserId", () => {
  silenceHandleSupabaseErrorConsole();

  it("returns current user when company id is null", async () => {
    const client = companiesClient({ data: { user_id: OWNER }, error: null });
    await expect(resolveContactOwnerUserId(client, null, CURRENT)).resolves.toBe(CURRENT);
    expect(client.from).not.toHaveBeenCalled();
  });

  it("returns current user when company id is empty string", async () => {
    const client = companiesClient({ data: null, error: null });
    await expect(resolveContactOwnerUserId(client, "", CURRENT)).resolves.toBe(CURRENT);
    expect(client.from).not.toHaveBeenCalled();
  });

  it("returns company owner when present", async () => {
    const client = companiesClient({ data: { user_id: OWNER }, error: null });
    await expect(resolveContactOwnerUserId(client, COMPANY, CURRENT)).resolves.toBe(OWNER);
  });

  it("returns current user when owner id is null", async () => {
    const client = companiesClient({ data: { user_id: null }, error: null });
    await expect(resolveContactOwnerUserId(client, COMPANY, CURRENT)).resolves.toBe(CURRENT);
  });

  it("returns current user when owner id is empty string", async () => {
    const client = companiesClient({ data: { user_id: "" }, error: null });
    await expect(resolveContactOwnerUserId(client, COMPANY, CURRENT)).resolves.toBe(CURRENT);
  });

  it("throws on Supabase error", async () => {
    const client = companiesClient({ data: null, error: { message: "e" } });
    await expect(resolveContactOwnerUserId(client, COMPANY, CURRENT)).rejects.toThrow(
      "Database error",
    );
  });
});
