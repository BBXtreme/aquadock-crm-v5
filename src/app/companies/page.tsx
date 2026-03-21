"use client";

import type React from "react";
import { useMemo, useState } from "react";

import Link from "next/link";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building, DollarSign, RefreshCw, Trophy, Users } from "lucide-react";
import { toast } from "sonner";

import AppLayout from "@/components/layout/AppLayout";
import CompaniesTable from "@/components/tables/CompaniesTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BulkDeleteConfirmationDialog } from "@/components/features/BulkDeleteConfirmationDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/browser";
import { getCompanies } from "@/lib/supabase/services/companies";
import { useCreateCompany, useDeleteCompany } from "@/hooks/useCompanyMutations";

export default function CompaniesPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);
  const [clearSelection, setClearSelection] = useState<() => void>(() => {});
  const [newCompany, setNewCompany] = useState({
    firmenname: "",
    kundentyp: "sonstige",
    status: "lead",
    value: 0,
  });

  const queryClient = useQueryClient();

  const {
    data: companies = [],
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const supabase = createClient();
      return getCompanies(supabase);
    },
    staleTime: 5 * 60 * 1000,
  });

  const { mutate: createCompany, isPending: isCreating } = useCreateCompany();
  const deleteCompany = useDeleteCompany();

  // Memo-isierte Statistiken – verhindert unnötige Neuberechnungen
  const stats = useMemo(() => {
    const total = companies.length;
    const leads = companies.filter((c) => c.status === "lead").length;
    const won = companies.filter((c) => c.status === "won").length;
    const value = companies.reduce((sum, c) => sum + (c.value ?? 0), 0);

    return { total, leads, won, value };
  }, [companies]);

  const handleCreateCompany = () => {
    createCompany(newCompany, {
      onSuccess: () => {
        setIsCreateDialogOpen(false);
        setNewCompany({
          firmenname: "",
          kundentyp: "sonstige",
          status: "lead",
          value: 0,
        });
      },
    });
  };

  const handleBulkDeleteClick = (ids: string[], clear: () => void) => {
    setBulkDeleteIds(ids);
    setClearSelection(() => clear);
    setIsBulkDeleteDialogOpen(true);
  };

  const handleConfirmBulkDelete = async () => {
    setIsBulkDeleteDialogOpen(false); // close early for perceived speed

    const promises = bulkDeleteIds.map(id => deleteCompany.mutateAsync({ id }));

    const results = await Promise.allSettled(promises);

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    console.log(`Successfully deleted ${successCount}/${bulkDeleteIds.length}`);

    // Error handling
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Failed to delete ${bulkDeleteIds[index]}:`, result.reason);
      }
    });

    queryClient.invalidateQueries({ queryKey: ["companies"] });

    if (successCount > 0) {
      toast.success(`${successCount} Firma${successCount !== 1 ? 'en' : ''} gelöscht`)
    }

    if (results.some(r => r.status === 'rejected')) {
      toast.error("Einige Löschungen sind fehlgeschlagen")
    }

    clearSelection();
    setBulkDeleteIds([]);
    // later steps will add toast + clear selection
  };

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
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>New Company</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Company</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="firmenname">Firmenname</Label>
                    <Input
                      id="firmenname"
                      value={newCompany.firmenname}
                      onChange={(e) => setNewCompany({ ...newCompany, firmenname: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="kundentyp">Kundentyp</Label>
                    <Select
                      value={newCompany.kundentyp}
                      onValueChange={(value) => setNewCompany({ ...newCompany, kundentyp: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="restaurant">Restaurant</SelectItem>
                        <SelectItem value="hotel">Hotel</SelectItem>
                        <SelectItem value="marina">Marina</SelectItem>
                        <SelectItem value="camping">Camping</SelectItem>
                        <SelectItem value="sonstige">Sonstige</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={newCompany.status}
                      onValueChange={(value) => setNewCompany({ ...newCompany, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lead">Lead</SelectItem>
                        <SelectItem value="qualifiziert">Qualifiziert</SelectItem>
                        <SelectItem value="akquise">Akquise</SelectItem>
                        <SelectItem value="angebot">Angebot</SelectItem>
                        <SelectItem value="gewonnen">Gewinnen</SelectItem>
                        <SelectItem value="verloren">Verloren</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="value">Value (€)</Label>
                    <Input
                      id="value"
                      type="number"
                      value={newCompany.value}
                      onChange={(e) => setNewCompany({ ...newCompany, value: Number(e.target.value) })}
                    />
                  </div>
                  <Button onClick={handleCreateCompany} disabled={isCreating}>
                    {isCreating ? "Creating..." : "Create"}
                  </Button>
                </div>
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
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={`company-skeleton-${i}`} className="h-14 w-full" />
                  ))}
                </div>
              </div>
            ) : (
              <CompaniesTable companies={companies} onBulkDelete={handleBulkDeleteClick} />
            )}
          </CardContent>
        </Card>

        <BulkDeleteConfirmationDialog
          open={isBulkDeleteDialogOpen}
          onOpenChange={setIsBulkDeleteDialogOpen}
          title={`${bulkDeleteIds.length} Firmen löschen`}
          description={`${bulkDeleteIds.length} Firmen wirklich löschen? Kontakte/Timeline werden mitgelöscht.`}
          onConfirm={handleConfirmBulkDelete}
          confirmText="Löschen"
          cancelText="Abbrechen"
          loading={deleteCompany.isPending}
          count={bulkDeleteIds.length}
        />
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
