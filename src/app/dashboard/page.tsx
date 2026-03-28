"use client";

import { useQuery } from "@tanstack/react-query";
import { Building, Users } from "lucide-react";
import { useState } from "react";

import { StatCard } from "@/components/ui/StatCard";
import { createClient } from "@/lib/supabase/browser";

export default function DashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("30d");

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats", selectedPeriod],
    queryFn: async () => {
      const supabase = createClient();

      // Get companies stats
      const { data: companies } = await supabase.from("companies").select("status, value, created_at");

      // Get contacts stats
      const { data: contacts } = await supabase.from("contacts").select("created_at");

      // Get timeline stats
      const { data: timeline } = await supabase.from("timeline").select("created_at");

      const now = new Date();
      const periodDays = selectedPeriod === "7d" ? 7 : selectedPeriod === "30d" ? 30 : 90;
      const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

      const companiesInPeriod = companies?.filter((c) => new Date(c.created_at!) >= periodStart) || [];
      const contactsInPeriod = contacts?.filter((c) => new Date(c.created_at!) >= periodStart) || [];
      const timelineInPeriod = timeline?.filter((t) => new Date(t.created_at!) >= periodStart) || [];

      return {
        totalCompanies: companies?.length || 0,
        totalContacts: contacts?.length || 0,
        totalActivities: timeline?.length || 0,
        companiesInPeriod: companiesInPeriod.length,
        contactsInPeriod: contactsInPeriod.length,
        activitiesInPeriod: timelineInPeriod.length,
        totalValue: companies?.reduce((sum, c) => sum + (c.value || 0), 0) || 0,
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
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`skeleton-${i}`} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
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
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Companies"
          value={stats?.totalCompanies.toLocaleString("de-DE") || "0"}
          icon={<Building className="h-5 w-5 text-muted-foreground" />}
          className="border-none shadow-sm bg-card/90 hover:shadow-md"
          change={`+${stats?.companiesInPeriod || 0} this period`}
        />
        <StatCard
          title="Total Contacts"
          value={stats?.totalContacts.toLocaleString("de-DE") || "0"}
          icon={<Users className="h-5 w-5 text-muted-foreground" />}
          className="border-none shadow-sm bg-card/90 hover:shadow-md"
          change={`+${stats?.contactsInPeriod || 0} this period`}
        />
        <StatCard
          title="Total Activities"
          value={stats?.totalActivities.toLocaleString("de-DE") || "0"}
          icon={<Building className="h-5 w-5 text-muted-foreground" />}
          className="border-none shadow-sm bg-card/90 hover:shadow-md"
          change={`+${stats?.activitiesInPeriod || 0} this period`}
        />
        <StatCard
          title="Total Value"
          value={`€${stats?.totalValue.toLocaleString("de-DE") || "0"}`}
          icon={<Building className="h-5 w-5 text-muted-foreground" />}
          className="border-none shadow-sm bg-card/90 hover:shadow-md"
          change="—"
        />
      </div>
    </div>
  );
}
