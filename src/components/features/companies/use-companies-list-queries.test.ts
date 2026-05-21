/**
 * Phase 2.1 — companies_stats() RPC adoption.
 *
 * Verifies that `fetchCompaniesStats`:
 *   - Calls the new server-side aggregate when `COMPANIES_P2_READS_ENABLED` is on.
 *   - Falls back to the legacy client-side full-table scan when the flag is off.
 *   - Falls back to the legacy path when the RPC errors (e.g. fresh DB without migration).
 *   - Returns the four KPI numbers in the same shape either way.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchCompaniesStats } from "./use-companies-list-queries";

type SupabaseLike = {
  rpc: ReturnType<typeof vi.fn>;
  from: ReturnType<typeof vi.fn>;
};

function makeSupabaseStub(): SupabaseLike {
  const select = vi.fn().mockReturnThis();
  const isFilter = vi.fn();
  const fromBuilder = { select, is: isFilter } as unknown as { select: typeof select; is: typeof isFilter };
  select.mockReturnValue(fromBuilder);
  return {
    rpc: vi.fn(),
    from: vi.fn(() => fromBuilder),
  };
}

describe("fetchCompaniesStats", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("COMPANIES_P2_READS_ENABLED", "");
    vi.stubEnv("NEXT_PUBLIC_COMPANIES_P2_READS_ENABLED", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("calls companies_stats RPC and returns the aggregated KPIs when reads flag on", async () => {
    vi.stubEnv("COMPANIES_P2_READS_ENABLED", "true");
    const supabase = makeSupabaseStub();
    supabase.rpc.mockResolvedValue({
      data: [{ total: 393, leads: 385, won: 5, value_sum: 12500 }],
      error: null,
    });

    const result = await fetchCompaniesStats(
      supabase as unknown as Parameters<typeof fetchCompaniesStats>[0],
    );

    expect(supabase.rpc).toHaveBeenCalledWith("companies_stats");
    expect(supabase.from).not.toHaveBeenCalled();
    expect(result).toEqual({ total: 393, leads: 385, won: 5, value: 12500 });
  });

  it("coerces numeric_string RPC fields (Supabase returns NUMERIC as string)", async () => {
    vi.stubEnv("COMPANIES_P2_READS_ENABLED", "true");
    const supabase = makeSupabaseStub();
    supabase.rpc.mockResolvedValue({
      data: [{ total: 100, leads: 80, won: 12, value_sum: "98765.5" }],
      error: null,
    });

    const result = await fetchCompaniesStats(
      supabase as unknown as Parameters<typeof fetchCompaniesStats>[0],
    );

    expect(result.value).toBe(98765.5);
    expect(typeof result.value).toBe("number");
  });

  it("falls back to client-side scan when reads flag is off", async () => {
    // Flag explicitly false to override any dev-default ON behaviour.
    vi.stubEnv("COMPANIES_P2_READS_ENABLED", "false");
    const supabase = makeSupabaseStub();
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockResolvedValue({
          data: [
            { status: "lead", value: 100 },
            { status: "lead", value: 200 },
            { status: "gewonnen", value: 5000 },
          ],
          error: null,
        }),
      }),
    });

    const result = await fetchCompaniesStats(
      supabase as unknown as Parameters<typeof fetchCompaniesStats>[0],
    );

    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(supabase.from).toHaveBeenCalledWith("companies");
    expect(result).toEqual({ total: 3, leads: 2, won: 1, value: 5300 });
  });

  it("falls back to client-side scan when RPC errors (fresh DB without migration)", async () => {
    vi.stubEnv("COMPANIES_P2_READS_ENABLED", "true");
    const supabase = makeSupabaseStub();
    supabase.rpc.mockResolvedValue({
      data: null,
      error: { code: "42883", message: "function companies_stats() does not exist" },
    });
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockResolvedValue({
          data: [{ status: "lead", value: 50 }],
          error: null,
        }),
      }),
    });

    const result = await fetchCompaniesStats(
      supabase as unknown as Parameters<typeof fetchCompaniesStats>[0],
    );

    expect(supabase.rpc).toHaveBeenCalledWith("companies_stats");
    expect(supabase.from).toHaveBeenCalledWith("companies");
    expect(result).toEqual({ total: 1, leads: 1, won: 0, value: 50 });
  });

  it("returns zero KPIs when RPC succeeds but data is empty", async () => {
    vi.stubEnv("COMPANIES_P2_READS_ENABLED", "true");
    const supabase = makeSupabaseStub();
    supabase.rpc.mockResolvedValue({ data: [], error: null });
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    const result = await fetchCompaniesStats(
      supabase as unknown as Parameters<typeof fetchCompaniesStats>[0],
    );

    expect(result).toEqual({ total: 0, leads: 0, won: 0, value: 0 });
  });
});
