"use client";

import { useEffect, useState } from "react";

import type { User } from "@supabase/supabase-js";
import { formatDistanceToNow } from "date-fns";

import KPICards from "@/components/dashboard/KPICards";
import SalesPipelineFunnel from "@/components/dashboard/SalesPipelineFunnel";
import SupabaseDebug from "@/components/debug/SupabaseDebug";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/browser";
import { debugQuery } from "@/lib/supabase/debug";
import { getCompanies } from "@/lib/supabase/services/companies";
import { getTimeline } from "@/lib/supabase/services/timeline";
import type { Company, TimelineEntry } from "@/lib/supabase/types";

export default function Home() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient();
        // Fetch all companies for consistent preview and calculations
        const companies = await getCompanies(supabase);
        setCompanies(companies);
        debugQuery("Dashboard Companies", companies);

        const timeline = await getTimeline(supabase);
        setTimeline(timeline.slice(0, 10));

        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) return <div className="p-8 text-center">Loading dashboard...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;

  // KPI calculations
  const totalCompanies = companies.length;
  const leads = companies.filter((c) => c.status === "lead").length;
  const won = companies.filter((c) => c.status === "won").length;
  const valueSum = companies.reduce((sum, c) => sum + (Number(c.value) || 0), 0);
  const wonValue = companies.filter((c) => c.status === "won").reduce((sum, c) => sum + (Number(c.value) || 0), 0);
  const avgValue = totalCompanies > 0 ? valueSum / totalCompanies : 0;

  const kundentypCounts = companies.reduce<Record<string, number>>((acc, company) => {
    const typ = company.kundentyp || "sonstige";
    acc[typ] = (acc[typ] || 0) + 1;
    return acc;
  }, {});

  const sortedKundentyp = Object.entries(kundentypCounts).sort((a, b) => b[1] - a[1]);
  const topKundentyp = sortedKundentyp[0]?.[0] || "N/A";

  const companiesByKundentyp = Object.entries(kundentypCounts).map(([kundentyp, count]) => ({
    kundentyp,
    count,
  }));

  // Calculate new companies this month
  const thisMonth = new Date();
  thisMonth.setDate(1);
  const newCompaniesThisMonth = companies.filter((c) => new Date(c.created_at as string) >= thisMonth).length;

  const kpis = [
    {
      title: "Total Companies",
      value: totalCompanies,
      changePercent: 12,
      subtitle: "from last month",
    },
    {
      title: "Active Leads",
      value: leads,
      changePercent: 8,
      subtitle: "from last month",
    },
    {
      title: "Won Deals",
      value: won,
      changePercent: 20,
      subtitle: "from last month",
    },
    {
      title: "Total Value",
      value: `€${wonValue.toLocaleString()}`,
      changePercent: 15,
      subtitle: "from last month",
    },
    {
      title: "New This Month",
      value: newCompaniesThisMonth,
      changePercent: 25,
      subtitle: "companies added",
    },
    {
      title: "Avg Value",
      value: `€${avgValue.toLocaleString()}`,
      changePercent: 10,
      subtitle: "average deal value",
    },
    {
      title: "Top Kundentyp",
      value: topKundentyp,
      changePercent: 5,
      subtitle: "most common type",
    },
  ];

  return (
    <AppLayout>
      <div className="container mx-auto space-y-8 p-6 lg:p-8">
        <div>
          <p className="text-muted-foreground text-sm">Home</p>
          <h1 className="font-semibold text-3xl tracking-tight">Dashboard</h1>
        </div>

        <KPICards kpis={kpis} />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Companies by Kundentyp</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-64 items-center justify-center rounded-lg bg-muted/50">
                <p className="text-muted-foreground">Bar chart placeholder (use Recharts or similar)</p>
                <div className="ml-6 space-y-2">
                  {companiesByKundentyp.map((item) => (
                    <div key={item.kundentyp} className="flex items-center space-x-3">
                      <div className="h-4 w-4 rounded-full bg-primary" />
                      <span className="font-medium text-sm">
                        {item.kundentyp}: {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timeline.length > 0 ? (
                  timeline.map((entry) => (
                    <div key={entry.id} className="flex items-start space-x-4 rounded-lg bg-muted/50 p-4">
                      <div className="mt-2 h-3 w-3 shrink-0 rounded-full bg-primary" />
                      <div>
                        <p className="font-medium">{entry.title}</p>
                        <p className="text-muted-foreground text-sm">
                          {entry.companies?.firmenname || "Unknown"} •{" "}
                          {formatDistanceToNow(new Date(entry.created_at || new Date()), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-8 text-center text-muted-foreground">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <SalesPipelineFunnel
          leads={680}
          qualified={480}
          proposal={210}
          negotiation={120}
          won={45}
          changePercent={18.2}
        />

        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => setDebugMode(!debugMode)}>
            {debugMode ? "Hide Debug" : "Show Debug"}
          </Button>
        </div>

        {debugMode && (
          <SupabaseDebug
            status={error ? "Error" : "Connected"}
            rowCount={companies.length}
            sampleData={companies.slice(0, 2)}
            error={error}
            user={user ? { id: user.id, email: user.email } : null}
            statusSummary={{
              lead: companies.filter((c) => c.status === "lead").length,
              won: companies.filter((c) => c.status === "won").length,
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
