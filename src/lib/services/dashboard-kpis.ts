// src/lib/services/dashboard-kpis.ts
// Server-side loader for the dashboard KPI aggregator (Phase 2.1).
// Wraps the `public.get_dashboard_kpis(period_days)` RPC and shapes the result
// into a stable, browser-safe POJO consumed by both the RSC dashboard page and
// the `/api/dashboard/kpis` route handler.

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

export type DashboardKpiPeriod = "7d" | "30d" | "90d";

export type DashboardKpis = {
  totalCompanies: number;
  totalContacts: number;
  totalActivities: number;
  companiesInPeriod: number;
  totalValue: number;
  leads: number;
  won: number;
  period: DashboardKpiPeriod;
};

const PERIOD_TO_DAYS: Record<DashboardKpiPeriod, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const EMPTY_KPIS: Omit<DashboardKpis, "period"> = {
  totalCompanies: 0,
  totalContacts: 0,
  totalActivities: 0,
  companiesInPeriod: 0,
  totalValue: 0,
  leads: 0,
  won: 0,
};

function toFiniteNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : 0;
}

/**
 * Loads dashboard KPIs for the given period via the SECURITY INVOKER RPC.
 * Returns zeroed KPIs on RPC failure so the dashboard renders without crashing.
 */
export async function loadDashboardKpis(
  client: SupabaseClient<Database>,
  period: DashboardKpiPeriod,
): Promise<DashboardKpis> {
  const { data, error } = await client.rpc("get_dashboard_kpis", {
    period_days: PERIOD_TO_DAYS[period],
  });

  if (error !== null) {
    console.error("[loadDashboardKpis] RPC failed:", error);
    return { ...EMPTY_KPIS, period };
  }

  const row = data?.[0];
  if (row === undefined) {
    return { ...EMPTY_KPIS, period };
  }

  return {
    totalCompanies: toFiniteNumber(row.total_companies),
    totalContacts: toFiniteNumber(row.total_contacts),
    totalActivities: toFiniteNumber(row.total_activities),
    companiesInPeriod: toFiniteNumber(row.companies_in_period),
    totalValue: toFiniteNumber(row.total_value),
    leads: toFiniteNumber(row.leads),
    won: toFiniteNumber(row.won),
    period,
  };
}

export function isDashboardKpiPeriod(value: unknown): value is DashboardKpiPeriod {
  return value === "7d" || value === "30d" || value === "90d";
}
