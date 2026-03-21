'use client';

import { Building, DollarSign, RefreshCw, Trophy, Users } from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner'; // ← korrekter Import für radix-nova Style
import AppLayout from '@/components/layout/AppLayout';
import CompaniesTable from '@/components/tables/CompaniesTable';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/browser';
import { getCompanies } from '@/lib/supabase/services/companies';
import type { Company } from '@/lib/supabase/types';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stabile Fetch-Funktion – keine externen Abhängigkeiten
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const data = await getCompanies(supabase);
      setCompanies(data ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Firmen konnten nicht geladen werden';
      setError(message);
      toast.error('Fehler beim Laden', {
        description: message,
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Memo-isierte Statistiken – verhindert unnötige Neuberechnungen
  const stats = useMemo(() => {
    const total = companies.length;
    const leads = companies.filter((c) => c.status === 'lead').length;
    const won = companies.filter((c) => c.status === 'won').length;
    const value = companies.reduce((sum, c) => sum + (c.value ?? 0), 0);

    return { total, leads, won, value };
  }, [companies]);

  if (error) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6 lg:p-8 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Home → Companies</p>
              <h1 className="text-3xl font-semibold tracking-tight">Companies</h1>
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
              <span>{error}</span>
              <Button variant="outline" onClick={fetchData}>
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
      <div className="container mx-auto p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Home → Companies</p>
            <h1 className="text-3xl font-semibold tracking-tight">Companies</h1>
          </div>
          <div className="flex gap-3">
            <Link href="/import">
              <Button variant="outline">Import CSV</Button>
            </Link>
            <Button>New Company</Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Gesamt Firmen"
            value={
              loading ? <Skeleton className="h-8 w-20" /> : stats.total.toLocaleString('de-DE')
            }
            icon={<Building className="h-5 w-5 text-muted-foreground" />}
          />
          <StatCard
            title="Leads"
            value={
              loading ? <Skeleton className="h-8 w-20" /> : stats.leads.toLocaleString('de-DE')
            }
            icon={<Users className="h-5 w-5 text-muted-foreground" />}
          />
          <StatCard
            title="Gewonnene Deals"
            value={loading ? <Skeleton className="h-8 w-20" /> : stats.won.toLocaleString('de-DE')}
            icon={<Trophy className="h-5 w-5 text-muted-foreground" />}
          />
          <StatCard
            title="Gesamtwert"
            value={
              loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                `€${stats.value.toLocaleString('de-DE')}`
              )
            }
            icon={<DollarSign className="h-5 w-5 text-muted-foreground" />}
          />
        </div>

        {/* Tabelle / Ladezustand */}
        <Card className="border-border shadow-sm rounded-xl">
          <CardContent className="p-6">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-56" />
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton className="h-14 w-full" />
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
function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <Card className="border-border bg-card shadow-sm rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
