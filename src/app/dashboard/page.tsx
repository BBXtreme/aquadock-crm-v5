"use client";

import type React from "react";
import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";
import {
  Building,
  DollarSign,
  Trophy,
  Users,
} from "lucide-react";

import AppLayout from "@/components/layout/AppLayout";
import StatCard from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/browser";

export default function DashboardPage() {
  const {
    data: companies = [],
    isLoading,
  } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("companies").select("*, contacts!company_id(*)");
      if (error) throw error;
      return data as any[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Memo-isierte Statistiken – verhindert unnötige Neuberechnungen
  const stats = useMemo(() => {
    const total = companies.length;
    const leads = companies.filter((c) => c.status === "lead").length;
    const won = companies.filter((c) => c.status === "won").length;
    const value = companies.reduce((sum, c) => sum + (c.value ?? 0), 0);

    return { total, leads, won, value };
  }, [companies]);

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-between pb-6 border-b">
            <div>
              <div className="text-sm text-muted-foreground">Home → Dashboard</div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Dashboard</h1>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Gesamt Firmen"
              value={isLoading ? <Skeleton className="h-8 w-20" /> : stats.total.toLocaleString("de-DE")}
              icon={<Building className="h-5 w-5 text-muted-foreground" />}
              change="+12% from last month"
            />
            <StatCard
              title="Leads"
              value={isLoading ? <Skeleton className="h-8 w-20" /> : stats.leads.toLocaleString("de-DE")}
              icon={<Users className="h-5 w-5 text-muted-foreground" />}
              change="+8% from last month"
            />
            <StatCard
              title="Gewonnene Deals"
              value={isLoading ? <Skeleton className="h-8 w-20" /> : stats.won.toLocaleString("de-DE")}
              icon={<Trophy className="h-5 w-5 text-muted-foreground" />}
              change="+15% from last month"
            />
            <StatCard
              title="Gesamtwert"
              value={isLoading ? <Skeleton className="h-8 w-20" /> : `€${stats.value.toLocaleString("de-DE")}`}
              icon={<DollarSign className="h-5 w-5 text-muted-foreground" />}
              change="+22% from last month"
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
