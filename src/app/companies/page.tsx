"use client";

import type React from "react";
import { useMemo, useState } from "react";

import Link from "next/link";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building, DollarSign, RefreshCw, Trophy, Upload, Users } from "lucide-react";
import { toast } from "sonner";

import CompanyCreateForm from "@/components/features/CompanyCreateForm";
import CompanyEditForm from "@/components/features/CompanyEditForm";
import AppLayout from "@/components/layout/AppLayout";
import CompaniesTable from "@/components/tables/CompaniesTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SkeletonList } from "@/components/ui/SkeletonList";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/browser";
import { createCompany, deleteCompany } from "@/lib/supabase/services/companies";
import type { Company, CompanyInsert } from "@/lib/supabase/types";

export default function CompaniesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | null>(null);

  const {
    data: companies = [],
    isLoading,
    error: queryError,
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

  const _createCompanyMutation = useMutation({
    mutationFn: async (newCompany: CompanyInsert) => {
      return createCompany(newCompany);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: async (id: string) => {
      return deleteCompany(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete company", { description: error.message });
    },
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Upload className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem asChild>
                    <Link href="/import/csv">Import CSV</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/import/json">Import JSON</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>New Company</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Company</DialogTitle>
                  </DialogHeader>
                  <CompanyCreateForm onSuccess={() => setDialogOpen(false)} />
                </DialogContent>
              </Dialog>
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Upload className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem asChild>
                  <Link href="/import/csv">Import CSV</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/import/json">Import JSON</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>New Company</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Company</DialogTitle>
                </DialogHeader>
                <CompanyCreateForm onSuccess={() => setDialogOpen(false)} />
              </DialogContent>
            </Dialog>
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
                <SkeletonList count={6} className="space-y-2" itemClassName="h-14 w-full" />
              </div>
            ) : (
              <CompaniesTable
                companies={companies}
                onEdit={setEditCompany}
                onDelete={(company) => deleteCompanyMutation.mutate(company.id)}
              />
            )}
          </CardContent>
        </Card>

        {editCompany && <CompanyEditForm company={editCompany} onSuccess={() => setEditCompany(null)} />}
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
