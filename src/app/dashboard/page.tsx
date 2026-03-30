// src/app/dashboard/page.tsx
// This file defines the Dashboard page of the application, which displays key metrics and statistics
// about companies, contacts, and activities.
// It uses React Query to fetch data from the Supabase backend and manage loading states.
// The dashboard includes a period selector to filter statistics for the last 7, 30, or 90 days.
// The statistics are displayed in StatCard components, showing total companies, leads, won deals,
// and total value, along with changes for the selected period.

"use client";

import { useQuery } from "@tanstack/react-query";
import { Building, DollarSign, Trophy, Users } from "lucide-react";
import { Suspense, useState } from "react";

import { LoadingState } from "@/components/ui/LoadingState";
import { StatCard } from "@/components/ui/StatCard";
import { createClient } from "@/lib/supabase/browser-client";

export default function DashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<"7d" | "30d" | "90d">("30d");

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats", selectedPeriod],
    queryFn: async () => {
      const supabase = createClient();

      const { data: companies } = await supabase.from("companies").select("status, value, created_at");

      const { data: contacts } = await supabase.from("contacts").select("created_at");

      const { data: timeline } = await supabase.from("timeline").select("created_at");

      const now = new Date();
      const periodDays = selectedPeriod === "7d" ? 7 : selectedPeriod === "30d" ? 30 : 90;
      const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

      // Safe date filtering without non-null assertion
      const companiesInPeriod =
        companies?.filter((c) => {
          if (!c.created_at) return false;
          return new Date(c.created_at) >= periodStart;
        }) || [];

      const contactsInPeriod =
        contacts?.filter((c) => {
          if (!c.created_at) return false;
          return new Date(c.created_at) >= periodStart;
        }) || [];

      const timelineInPeriod =
        timeline?.filter((t) => {
          if (!t.created_at) return false;
          return new Date(t.created_at) >= periodStart;
        }) || [];

      return {
        totalCompanies: companies?.length || 0,
        totalContacts: contacts?.length || 0,
        totalActivities: timeline?.length || 0,
        companiesInPeriod: companiesInPeriod.length,
        contactsInPeriod: contactsInPeriod.length,
        activitiesInPeriod: timelineInPeriod.length,
        totalValue: companies?.reduce((sum, c) => sum + (c.value || 0), 0) || 0,
        leads: companies?.filter((c) => c.status === "lead").length || 0,
        won: companies?.filter((c) => c.status === "gewonnen").length || 0,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-8 p-6 lg:p-8">
        <div className="flex items-center justify-between pb-6 border-b">
          <div>
            <div className="text-sm text-muted-foreground">Home → Dashboard</div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Dashboard
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <LoadingState count={4} className="" itemClassName="h-32 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-8 p-6 lg:p-8">
      <div className="flex items-center justify-between pb-6 border-b">
        <div>
          <div className="text-sm text-muted-foreground">Home → Dashboard</div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Dashboard
          </h1>
        </div>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value as "7d" | "30d" | "90d")}
          className="px-3 py-2 border rounded-md"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      <Suspense fallback={<LoadingState count={8} />}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Companies"
            value={stats?.totalCompanies.toLocaleString("de-DE") || "0"}
            icon={<Building className="h-5 w-5 text-muted-foreground" />}
            className="border-none shadow-sm bg-card/90 hover:shadow-md"
            change={`+${stats?.companiesInPeriod || 0} this period`}
          />
          <StatCard
            title="Leads"
            value={stats?.leads.toLocaleString("de-DE") || "0"}
            icon={<Users className="h-5 w-5 text-muted-foreground" />}
            className="border-none shadow-sm bg-card/90 hover:shadow-md"
            change={`+${stats?.companiesInPeriod || 0} this period`}
          />
          <StatCard
            title="Gewonnene Deals"
            value={stats?.won.toLocaleString("de-DE") || "0"}
            icon={<Trophy className="h-5 w-5 text-muted-foreground" />}
            className="border-none shadow-sm bg-card/90 hover:shadow-md"
            change={`+${stats?.companiesInPeriod || 0} this period`}
          />
          <StatCard
            title="Total Value"
            value={`€${stats?.totalValue.toLocaleString("de-DE") || "0"}`}
            icon={<DollarSign className="h-5 w-5 text-muted-foreground" />}
            className="border-none shadow-sm bg-card/90 hover:shadow-md"
            change="—"
          />
        </div>
      </Suspense>
    </div>
  );
}
