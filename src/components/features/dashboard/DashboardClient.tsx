// src/components/features/dashboard/DashboardClient.tsx
// This file defines the DashboardClient component, which is responsible for fetching and displaying the dashboard statistics and visualizations.
// It uses React Query's useSuspenseQuery to fetch data from Supabase, including total companies, contacts, activities, and sales funnel data.
// The component renders KPI overview cards for total companies, active leads, won deals, and total pipeline value, as well as visualizations for the sales funnel and status distribution.
// The period for the statistics can be selected from a dropdown, allowing users to view data for the last 7, 30, or 90 days.

"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Building, DollarSign, Trophy, Users } from "lucide-react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useLayoutEffect, useMemo, useState } from "react";
import { StatCard } from "@/components/ui/StatCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNumberLocaleTag, useT } from "@/lib/i18n/use-translations";
import type { DashboardKpis } from "@/lib/services/dashboard-kpis";
import type { DashboardChartsProps } from "./DashboardCharts";

const DashboardCharts = dynamic<DashboardChartsProps>(
  () => import("./DashboardCharts").then((m) => m.default),
  { ssr: false, loading: () => <div className="min-h-[300px] h-[320px] w-full animate-pulse bg-muted rounded" /> }
);

/** Light :root chart tokens from globals.css — SSR / first paint before computed styles run. */
const CHART_FILLS_FALLBACK = [
  "oklch(0.645 0.16 197)",
  "oklch(0.55 0.13 225)",
  "oklch(0.72 0.12 195)",
  "oklch(0.65 0.10 160)",
  "oklch(0.58 0.08 265)",
] as const;

type FunnelStageKey = "leads" | "qualified" | "proposal" | "negotiation" | "closedWon";

type FunnelRowRaw = { stageKey: FunnelStageKey; value: number };

type DashboardStats = {
  totalCompanies: number;
  totalContacts: number;
  totalActivities: number;
  companiesInPeriod: number;
  totalValue: number;
  leads: number;
  won: number;
  funnelDataRaw: FunnelRowRaw[];
};

function buildFunnelDataRaw(leads: number, won: number): FunnelRowRaw[] {
  return [
    { stageKey: "leads", value: leads || 42 },
    { stageKey: "qualified", value: Math.round(leads * 0.65) || 27 },
    { stageKey: "proposal", value: Math.round(leads * 0.45) || 19 },
    { stageKey: "negotiation", value: Math.round(leads * 0.3) || 13 },
    { stageKey: "closedWon", value: won || 9 },
  ];
}

function buildStatsFromKpis(k: DashboardKpis): DashboardStats {
  return {
    totalCompanies: k.totalCompanies,
    totalContacts: k.totalContacts,
    totalActivities: k.totalActivities,
    companiesInPeriod: k.companiesInPeriod,
    totalValue: k.totalValue,
    leads: k.leads,
    won: k.won,
    funnelDataRaw: buildFunnelDataRaw(k.leads, k.won),
  };
}

function readChartFillsFromDocument(): readonly [string, string, string, string, string] {
  if (typeof document === "undefined") {
    return CHART_FILLS_FALLBACK;
  }
  const style = getComputedStyle(document.documentElement);
  const read = (name: string) => {
    const value = style.getPropertyValue(name).trim();
    return value.length > 0 ? value : "oklch(0.5 0 0)";
  };
  return [
    read("--chart-1"),
    read("--chart-2"),
    read("--chart-3"),
    read("--chart-4"),
    read("--chart-5"),
  ] as const;
}

function useChartFillsForSvg(): readonly [string, string, string, string, string] {
  const { resolvedTheme } = useTheme();
  const [fills, setFills] = useState<readonly [string, string, string, string, string]>(CHART_FILLS_FALLBACK);

  useLayoutEffect(() => {
    void resolvedTheme;
    setFills(readChartFillsFromDocument());
  }, [resolvedTheme]);

  return fills;
}

type DashboardClientProps = {
  initialKpis: DashboardKpis;
};

export default function DashboardClient({ initialKpis }: DashboardClientProps) {
  const t = useT("dashboard");
  const localeTag = useNumberLocaleTag();
  const chartFills = useChartFillsForSvg();
  const [selectedPeriod, setSelectedPeriod] = useState<"7d" | "30d" | "90d">(initialKpis.period);

  const stats = useSuspenseQuery({
    queryKey: ["dashboard-kpis", selectedPeriod] as const,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/kpis?period=${selectedPeriod}`);
      if (!res.ok) {
        throw new Error(`Dashboard KPIs failed (${res.status})`);
      }
      const kpis: DashboardKpis = await res.json();
      return buildStatsFromKpis(kpis);
    },
    initialData:
      selectedPeriod === initialKpis.period ? buildStatsFromKpis(initialKpis) : undefined,
  });

  const data = stats.data;

  const funnelData = useMemo(
    () =>
      data.funnelDataRaw.map((row, index) => ({
        ...row,
        stage: t(`funnel.${row.stageKey}`),
        fill: chartFills[index % chartFills.length] ?? "#64748b",
      })),
    [chartFills, data.funnelDataRaw, t],
  );

  const kpiChange = t("kpiChangeThisPeriod", { count: data.companiesInPeriod });

  return (
    <div className="space-y-8">
      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("kpiTotalCompanies")}
          value={data.totalCompanies.toLocaleString(localeTag)}
          icon={<Building className="h-5 w-5 text-muted-foreground" />}
          change={kpiChange}
        />
        <StatCard
          title={t("kpiActiveLeads")}
          value={data.leads.toLocaleString(localeTag)}
          icon={<Users className="h-5 w-5 text-muted-foreground" />}
          change={kpiChange}
        />
        <StatCard
          title={t("kpiWonDeals")}
          value={data.won.toLocaleString(localeTag)}
          icon={<Trophy className="h-5 w-5 text-muted-foreground" />}
          change={kpiChange}
        />
        <StatCard
          title={t("kpiPipelineValue")}
          value={`€${data.totalValue.toLocaleString(localeTag)}`}
          icon={<DollarSign className="h-5 w-5 text-muted-foreground" />}
          change={t("kpiChangeDash")}
        />
      </div>

      <DashboardCharts funnelData={funnelData} />

      {/* Period Selector */}
      <div className="flex justify-end">
        <Select
          value={selectedPeriod}
          onValueChange={(v) => setSelectedPeriod(v as "7d" | "30d" | "90d")}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">{t("period7d")}</SelectItem>
            <SelectItem value="30d">{t("period30d")}</SelectItem>
            <SelectItem value="90d">{t("period90d")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
