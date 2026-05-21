/**
 * companies_stats() RPC adoption for list-page KPIs.
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
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("calls companies_stats RPC and returns the aggregated KPIs", async () => {
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

  it("falls back to client-side scan when RPC errors (fresh DB without migration)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
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
    warn.mockRestore();
  });

  it("returns zero KPIs when RPC succeeds but data is empty", async () => {
    const supabase = makeSupabaseStub();
    supabase.rpc.mockResolvedValue({ data: [], error: null });

    const result = await fetchCompaniesStats(
      supabase as unknown as Parameters<typeof fetchCompaniesStats>[0],
    );

    expect(supabase.rpc).toHaveBeenCalledWith("companies_stats");
    expect(supabase.from).not.toHaveBeenCalled();
    expect(result).toEqual({ total: 0, leads: 0, won: 0, value: 0 });
  });
});
