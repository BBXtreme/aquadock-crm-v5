"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/browser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CompaniesTable from "@/components/tables/CompaniesTable";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building, Users, Trophy, DollarSign, RefreshCw } from "lucide-react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { Company } from "@/lib/supabase/types";
import { getCompanies } from "@/lib/supabase/services/companies";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const companies = await getCompanies(supabase);
      setCompanies(companies);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch companies",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalCompanies = companies.length;
  const leads = companies.filter((c) => c.status === "lead").length;
  const won = companies.filter((c) => c.status === "won").length;
  const valueSum = companies.reduce(
    (sum: number, c: Company) => sum + (c.value || 0),
    0,
  );

  if (error) {
    return (
      <AppLayout>
        <div className="container mx-auto p-6 lg:p-8 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {"Home > Companies"}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                Companies
              </h1>
            </div>
            <div className="flex space-x-2">
              <Link href="/import">
                <Button variant="outline">Import CSV</Button>
              </Link>
              <Button>New Company</Button>
            </div>
          </div>
          <Alert variant="destructive" className="border-red-500">
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                onClick={fetchData}
                variant="outline"
                className="border-[#24BACC] text-[#24BACC] hover:bg-[#24BACC] hover:text-white"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
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
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {"Home > Companies"}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">Companies</h1>
          </div>
          <div className="flex space-x-2">
            <Link href="/import">
              <Button variant="outline">Import CSV</Button>
            </Link>
            <Button>New Company</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Companies
              </CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{totalCompanies}</div>
              )}
            </CardContent>
          </Card>
          <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{leads}</div>
              )}
            </CardContent>
          </Card>
          <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Won Deals</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{won}</div>
              )}
            </CardContent>
          </Card>
          <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">
                  €{valueSum.toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-xl">
          <CardContent className="p-6">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
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
