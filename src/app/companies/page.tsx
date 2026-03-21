"use client";

import type React from "react";
import { useMemo } from "react";

import Link from "next/link";

import { Building, DollarSign, RefreshCw, Trophy, Users } from "lucide-react";
import { toast } from "sonner"; // ← korrekter Import für radix-nova Style
import { useQuery } from '@tanstack/react-query';

import AppLayout from "@/components/layout/AppLayout";
import CompaniesTable from "@/components/tables/CompaniesTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/browser";
import { getCompanies } from "@/lib/supabase/services/companies";
import type { Company } from "@/lib/supabase/types";

export default function CompaniesPage() {
  const { data: companies = [], isLoading, error: queryError } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const supabase = createClient();
      return getCompanies(supabase);
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

  if (queryError) {
    return (
      <AppLayout>
        <div className="container mx-auto space-y-8 p-6 lg:p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Home → Companies</p>
              <h1 className="font-semibold text-3xl tracking-tight">Companies</h1>
            </div>
            <div className="flex gap-3">
              <Link href="/import">
                <Button variant="outline">Import CSV</Button>
              </Link>
              <Button>New Company</Button>
            </div>
          </div>

          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between gap-4">
              <span>{queryError.message}</span>
              <Button variant="outline" onClick={() => window.location.reload()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Erneut versuchen
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto space-y-8 p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">Home → Companies</p>
            <h1 className="font-semibold text-3xl tracking-tight">Companies</h1>
          </div>
          <div className="flex gap-3">
            <Link href="/import">
              <Button variant="outline">Import CSV</Button>
              </Link>
            <Button>New Company</Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Gesamt Firmen"
            value={isLoading ? <Skeleton className="h-8 w-20" /> : stats.total.toLocaleString("de-DE")}
            icon={<Building className="h-5 w-5 text-muted-foreground" />}
          />
          <StatCard
            title="Leads"
            value={isLoading ? <Skeleton className="h-8 w-20" /> : stats.leads.toLocaleString("de-DE")}
            icon={<Users className="h-5 w-5 text-muted-foreground" />}
          />
          <StatCard
            title="Gewonnene Deals"
            value={isLoading ? <Skeleton className="h-8 w-20" /> : stats.won.toLocaleString("de-DE")}
            icon={<Trophy className="h-5 w-5 text-muted-foreground" />}
          />
          <StatCard
            title="Gesamtwert"
            value={isLoading ? <Skeleton className="h-8 w-20" /> : `€${stats.value.toLocaleString("de-DE")}`}
            icon={<DollarSign className="h-5 w-5 text-muted-foreground" />}
          />
        </div>

        {/* Tabelle / Ladezustand */}
        <Card className="border-border rounded-xl shadow-sm">
          <CardContent className="p-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-56" />
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="h-14 w-full" />
                  ))}
                </div>
              </div>
            ) : (
              <CompaniesTable companies={companies} />
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

// Wiederverwendbare Statistik-Karte
function StatCard({ title, value, icon }: { title: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <Card className="bg-card border-border rounded-xl shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="font-medium text-sm">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="font-bold text-2xl">{value}</div>
      </CardContent>
    </Card>
  );
}
