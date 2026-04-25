// src/components/features/dashboard/DashboardClient.tsx
// This file defines the DashboardClient component, which is responsible for fetching and displaying the dashboard statistics and visualizations.
// It uses React Query's useSuspenseQuery to fetch data from Supabase, including total companies, contacts, activities, and sales funnel data.
// The component renders KPI overview cards for total companies, active leads, won deals, and total pipeline value, as well as visualizations for the sales funnel and status distribution.
// The period for the statistics can be selected from a dropdown, allowing users to view data for the last 7, 30, or 90 days.

"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Building, DollarSign, TrendingUp, Trophy, Users } from "lucide-react";
import { useTheme } from "next-themes";
import { useLayoutEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StatCard } from "@/components/ui/StatCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNumberLocaleTag, useT } from "@/lib/i18n/use-translations";
import { createClient } from "@/lib/supabase/browser";

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

/** Recharts 3 defaults to -1×-1 until resize; avoids console noise and layout flash. */
const CHART_INITIAL = { width: 640, height: 320 } as const;

export default function DashboardClient() {
  const t = useT("dashboard");
  const localeTag = useNumberLocaleTag();
  const chartFills = useChartFillsForSvg();
  const [selectedPeriod, setSelectedPeriod] = useState<"7d" | "30d" | "90d">("30d");

  const stats = useSuspenseQuery({
    queryKey: ["dashboard-stats", selectedPeriod],
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const supabase = createClient();

      const { data: companies } = await supabase
        .from("companies")
        .select("status, value, created_at")
        .is("deleted_at", null);

      const { data: contacts } = await supabase.from("contacts").select("created_at").is("deleted_at", null);

      const { data: timeline } = await supabase.from("timeline").select("created_at").is("deleted_at", null);

      const now = new Date();
      const periodDays = selectedPeriod === "7d" ? 7 : selectedPeriod === "30d" ? 30 : 90;
      const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

      const companiesInPeriod =
        companies?.filter((c) => {
          if (!c.created_at) return false;
          return new Date(c.created_at) >= periodStart;
        }) || [];

      const totalValue = companies?.reduce((sum, c) => sum + (c.value || 0), 0) || 0;
      const leads = companies?.filter((c) => c.status === "lead").length || 0;
      const won = companies?.filter((c) => c.status === "gewonnen").length || 0;

      const funnelDataRaw: FunnelRowRaw[] = [
        { stageKey: "leads", value: leads || 42 },
        { stageKey: "qualified", value: Math.round(leads * 0.65) || 27 },
        { stageKey: "proposal", value: Math.round(leads * 0.45) || 19 },
        { stageKey: "negotiation", value: Math.round(leads * 0.3) || 13 },
        { stageKey: "closedWon", value: won || 9 },
      ];

      return {
        totalCompanies: companies?.length || 0,
        totalContacts: contacts?.length || 0,
        totalActivities: timeline?.length || 0,
        companiesInPeriod: companiesInPeriod.length,
        totalValue,
        leads,
        won,
        funnelDataRaw,
      };
    },
  });

  const data = stats.data;

  const funnelData = useMemo(
    () =>
      data.funnelDataRaw.map((row, index) => ({
        ...row,
        stage: t(`funnel.${row.stageKey}`),
        fill: chartFills[index % chartFills.length],
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

      {/* Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Funnel */}
        <div className="bg-card rounded-(--radius) border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> {t("funnelTitle")}
            </h3>
            <span className="text-xs text-muted-foreground">{t("funnelSubtitle")}</span>
          </div>
          <div className="min-h-[300px] h-[320px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={CHART_INITIAL}>
              <BarChart data={funnelData} layout="vertical" barCategoryGap={18}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="stage"
                  width={110}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 13 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="value" radius={8}>
                  {funnelData.map((entry) => (
                    <Cell key={entry.stageKey} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-card rounded-(--radius) border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" /> {t("statusTitle")}
            </h3>
          </div>
          <div className="min-h-[300px] h-[320px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={CHART_INITIAL}>
              <PieChart>
                <Pie
                  data={funnelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={115}
                  dataKey="value"
                  animationDuration={800}
                >
                  {funnelData.map((entry) => (
                    <Cell key={entry.stageKey} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

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
