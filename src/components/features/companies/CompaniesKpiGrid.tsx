"use client";

import { Building, DollarSign, Trophy, Users } from "lucide-react";

import { StatCard } from "@/components/ui/StatCard";

type CompaniesKpiGridProps = {
  localeTag: string;
  statTotal: string;
  statLeads: string;
  statWon: string;
  statValue: string;
  statTrend: string;
  total: number;
  leads: number;
  won: number;
  value: number;
};

export function CompaniesKpiGrid({
  localeTag,
  statTotal,
  statLeads,
  statWon,
  statValue,
  statTrend,
  total,
  leads,
  won,
  value,
}: CompaniesKpiGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title={statTotal}
        value={total.toLocaleString(localeTag)}
        icon={<Building className="h-5 w-5 text-muted-foreground" />}
        className="border-none shadow-sm bg-card/90 hover:shadow-md"
        change={statTrend}
      />
      <StatCard
        title={statLeads}
        value={leads.toLocaleString(localeTag)}
        icon={<Users className="h-5 w-5 text-muted-foreground" />}
        className="border-none shadow-sm bg-card/90 hover:shadow-md"
        change={statTrend}
      />
      <StatCard
        title={statWon}
        value={won.toLocaleString(localeTag)}
        icon={<Trophy className="h-5 w-5 text-muted-foreground" />}
        className="border-none shadow-sm bg-card/90 hover:shadow-md"
        change={statTrend}
      />
      <StatCard
        title={statValue}
        value={`€${value.toLocaleString(localeTag)}`}
        icon={<DollarSign className="h-5 w-5 text-muted-foreground" />}
        className="border-none shadow-sm bg-card/90 hover:shadow-md"
        change={statTrend}
      />
    </div>
  );
}
