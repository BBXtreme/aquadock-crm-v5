"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import KPICards from "@/components/dashboard/KPICards";
import SalesPipelineFunnel from "@/components/dashboard/SalesPipelineFunnel";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import AppLayout from "@/components/layout/AppLayout";
import { getCompanies } from "@/lib/supabase/services/companies";
import { getTimeline } from "@/lib/supabase/services/timeline";
import { Company, TimelineEntry } from "@/lib/supabase/types";
import { debugQuery } from "@/lib/supabase/debug";

export default function Home() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [user, setUser] = useState<any>(null);

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

        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading)
    return <div className="p-8 text-center">Loading dashboard...</div>;
  if (error)
    return <div className="p-8 text-red-500 text-center">Error: {error}</div>;

  // KPI calculations
  const totalCompanies = companies.length;
  const leads = companies.filter((c) => c.status === "lead").length;
  const won = companies.filter((c) => c.status === "won").length;
  const valueSum = companies.reduce(
    (sum, c) => sum + (Number(c.value) || 0),
    0,
  );
  const wonValue = companies
    .filter((c) => c.status === "won")
    .reduce((sum, c) => sum + (Number(c.value) || 0), 0);
  const avgValue = totalCompanies > 0 ? valueSum / totalCompanies : 0;

  const kundentypCounts = companies.reduce<Record<string, number>>(
    (acc, company) => {
      const typ = company.kundentyp || "sonstige";
      acc[typ] = (acc[typ] || 0) + 1;
      return acc;
    },
    {},
  );

  const sortedKundentyp = Object.entries(kundentypCounts).sort(
    (a, b) => b[1] - a[1],
  );
  const topKundentyp = sortedKundentyp[0]?.[0] || "N/A";

  const companiesByKundentyp = Object.entries(kundentypCounts).map(
    ([kundentyp, count]) => ({
      kundentyp,
      count,
    }),
  );

  // Calculate new companies this month
  const thisMonth = new Date();
  thisMonth.setDate(1);
  const newCompaniesThisMonth = companies.filter(
    (c) => new Date(c.created_at as string) >= thisMonth,
  ).length;

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
      <div className="container mx-auto p-6 lg:p-8 space-y-8">
        <div>
          <p className="text-sm text-muted-foreground">Home</p>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        </div>

        <KPICards kpis={kpis} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Companies by Kundentyp</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-muted/50 rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">
                  Bar chart placeholder (use Recharts or similar)
                </p>
                <div className="ml-6 space-y-2">
                  {companiesByKundentyp.map((item) => (
                    <div
                      key={item.kundentyp}
                      className="flex items-center space-x-3"
                    >
                      <div className="w-4 h-4 bg-primary rounded-full" />
                      <span className="text-sm font-medium">
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
                    <div
                      key={entry.id}
                      className="flex items-start space-x-4 p-4 bg-muted/50 rounded-lg"
                    >
                      <div className="w-3 h-3 bg-primary rounded-full mt-2 flex-shrink-0" />
                      <div>
                        <p className="font-medium">{entry.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {entry.companies?.firmenname || "Unknown"} •{" "}
                          {formatDistanceToNow(
                            new Date(entry.created_at || new Date()),
                            {
                              addSuffix: true,
                            },
                          )}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No recent activity
                  </p>
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
          <Button
            variant="outline"
            onClick={() => setDebugMode(!debugMode)}
          >
            {debugMode ? "Hide Debug" : "Show Debug"}
          </Button>
        </div>

        {debugMode && (
          <Card>
            <CardHeader>
              <CardTitle>Supabase Connection Debug</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm max-h-96">
                {JSON.stringify(
                  {
                    status: error ? "Error" : "Connected",
                    rowCount: companies.length,
                    sampleData: companies.slice(0, 2),
                    error: error ?? null,
                    user: user ? { id: user.id, email: user.email } : null,
                  },
                  null,
                  2,
                )}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
