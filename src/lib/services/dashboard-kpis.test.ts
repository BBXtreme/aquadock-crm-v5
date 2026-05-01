import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";
import {
  type DashboardKpiPeriod,
  isDashboardKpiPeriod,
  loadDashboardKpis,
} from "@/lib/services/dashboard-kpis";
import type { Database } from "@/types/database.types";

function rpcClient(result: { data: unknown; error: unknown }) {
  return {
    rpc: vi.fn().mockResolvedValue(result),
  } as unknown as SupabaseClient<Database>;
}

describe("isDashboardKpiPeriod", () => {
  it("accepts allowed periods", () => {
    const periods: DashboardKpiPeriod[] = ["7d", "30d", "90d"];
    for (const p of periods) {
      expect(isDashboardKpiPeriod(p)).toBe(true);
    }
  });

  it("rejects other values", () => {
    expect(isDashboardKpiPeriod("1d")).toBe(false);
    expect(isDashboardKpiPeriod(null)).toBe(false);
    expect(isDashboardKpiPeriod(30)).toBe(false);
  });
});

describe("loadDashboardKpis", () => {
  let consoleErrorSpy: MockInstance<Console["error"]>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("returns zeroed KPIs and logs when RPC errors", async () => {
    const client = rpcClient({
      data: null,
      error: { message: "rpc failed" },
    });
    await expect(loadDashboardKpis(client, "30d")).resolves.toEqual({
      totalCompanies: 0,
      totalContacts: 0,
      totalActivities: 0,
      companiesInPeriod: 0,
      totalValue: 0,
      leads: 0,
      won: 0,
      period: "30d",
    });
    expect(client.rpc).toHaveBeenCalledWith("get_dashboard_kpis", { period_days: 30 });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("returns zeroed KPIs when data array is empty", async () => {
    const client = rpcClient({ data: [], error: null });
    await expect(loadDashboardKpis(client, "7d")).resolves.toEqual({
      totalCompanies: 0,
      totalContacts: 0,
      totalActivities: 0,
      companiesInPeriod: 0,
      totalValue: 0,
      leads: 0,
      won: 0,
      period: "7d",
    });
  });

  it("coerces numeric strings and maps non-finite to 0", async () => {
    const client = rpcClient({
      data: [
        {
          total_companies: "3",
          total_contacts: 2,
          total_activities: null,
          companies_in_period: "NaN",
          total_value: Number.NaN,
          leads: "-1",
          won: Infinity,
        },
      ],
      error: null,
    });
    await expect(loadDashboardKpis(client, "90d")).resolves.toEqual({
      totalCompanies: 3,
      totalContacts: 2,
      totalActivities: 0,
      companiesInPeriod: 0,
      totalValue: 0,
      leads: -1,
      won: 0,
      period: "90d",
    });
  });

  it("maps a full RPC row", async () => {
    const client = rpcClient({
      data: [
        {
          total_companies: 10,
          total_contacts: 20,
          total_activities: 30,
          companies_in_period: 5,
          total_value: 99.5,
          leads: 2,
          won: 1,
        },
      ],
      error: null,
    });
    await expect(loadDashboardKpis(client, "30d")).resolves.toEqual({
      totalCompanies: 10,
      totalContacts: 20,
      totalActivities: 30,
      companiesInPeriod: 5,
      totalValue: 99.5,
      leads: 2,
      won: 1,
      period: "30d",
    });
  });
});
