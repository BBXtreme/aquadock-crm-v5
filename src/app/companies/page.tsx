"use client";

import type React from "react";
import { useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Building,
  Calendar,
  DollarSign,
  Edit,
  Eye,
  RefreshCw,
  Trophy,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import CompanyCreateForm from "@/components/features/CompanyCreateForm";
import CompanyEditForm from "@/components/features/CompanyEditForm";
import AppLayout from "@/components/layout/AppLayout";
import CompaniesTable from "@/components/tables/CompaniesTable";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SkeletonList } from "@/components/ui/SkeletonList";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/browser";
import { createCompany, deleteCompany, updateCompany } from "@/lib/supabase/services/companies";
import type { Company, CompanyInsert } from "@/lib/supabase/types";

export default function CompaniesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [activeFilters, setActiveFilters] = useState({
    status: [],
    kategorie: [],
    betriebstyp: [],
    land: [],
  });

  const statusOptions = ["lead", "interessant", "qualifiziert", "akquise", "angebot", "gewonnen", "verloren", "kunde", "partner", "inaktiv"];

  const kategorieOptions = [
    "restaurant", "hotel", "resort", "camping", "marina", "segelschule", "segelverein", "bootsverleih", "neukunde", "bestandskunde", "interessent", "partner", "sonstige"
  ];

  const betriebstypOptions = ["kette", "einzeln"];

  const landOptions = [
    "Deutschland", "Österreich", "Schweiz", "Frankreich", "Italien", "Spanien", "Niederlande", "Belgien", "Dänemark", "Schweden", "Norwegen", "Polen", "Ungarn", "Griechenland", "Portugal", "Großbritannien"
  ];

  const kategorieIcons = {
    restaurant: "🍽",
    hotel: "🏨",
    resort: "🌴",
    camping: "⛺",
    marina: "⚓",
    segelschule: "⛵",
    segelverein: "🏆",
    bootsverleih: "🚤",
    neukunde: "🆕",
    bestandskunde: "⭐",
    interessent: "👁",
    partner: "🤝",
    sonstige: "",
  };

  const toggleFilter = (group: string, value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [group]: prev[group].includes(value)
        ? prev[group].filter(v => v !== value)
        : [...prev[group], value]
    }));
  };

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

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Company> }) => updateCompany(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company updated");
    },
    onError: (err) => toast.error("Update failed", { description: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company deleted");
    },
    onError: (err) => toast.error("Deletion failed", { description: err.message }),
  });

  // Memo-isierte Statistiken – verhindert unnötige Neuberechnungen
  const stats = useMemo(() => {
    const total = companies.length;
    const leads = companies.filter((c) => c.status === "lead").length;
    const won = companies.filter((c) => c.status === "won").length;
    const value = companies.reduce((sum, c) => sum + (c.value ?? 0), 0);

    return { total, leads, won, value };
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      if (activeFilters.status.length > 0 && !activeFilters.status.includes(c.status)) return false;
      if (activeFilters.kategorie.length > 0 && !activeFilters.kategorie.includes(c.kundentyp)) return false;
      if (activeFilters.betriebstyp.length > 0 && !activeFilters.betriebstyp.includes(c.firmentyp)) return false;
      if (activeFilters.land.length > 0 && !activeFilters.land.includes(c.land)) return false;
      return true;
    });
  }, [companies, activeFilters]);

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
              <div className="space-y-2">
                <Skeleton className="h-8 w-56" />
                <SkeletonList count={6} className="space-y-2" itemClassName="h-14 w-full" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mt-2 mb-4">
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(activeFilters).map(([group, values]) => 
                      values.map(v => (
                        <Badge key={v} variant="secondary" onClick={() => toggleFilter(group, v)}>
                          {v} ×
                        </Badge>
                      ))
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setActiveFilters({status:[], kategorie:[], betriebstyp:[], land:[]})}>
                    Clear all
                  </Button>
                </div>
                <Accordion type="single" collapsible className="mb-3">
                  <AccordionItem value="filters">
                    <AccordionTrigger>Filters ({Object.values(activeFilters).flat().length})</AccordionTrigger>
                    <AccordionContent>
                      <div className="mb-4">
                        <h4 className="font-normal">Status</h4>
                        <div className="flex flex-wrap gap-2">
                          {statusOptions.map(s => (
                            <Button
                              key={s}
                              variant={activeFilters.status.includes(s) ? "secondary" : "outline"}
                              size="sm"
                              className="text-xs font-normal hover:bg-accent hover:text-accent-foreground transition-colors rounded-lg h-6"
                              onClick={() => toggleFilter('status', s)}
                            >
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="mb-4">
                        <h4 className="font-normal">Kategorie</h4>
                        <div className="flex flex-wrap gap-2">
                          {kategorieOptions.map(k => {
                            const Icon = kategorieIcons[k];
                            return (
                              <Button
                                key={k}
                                variant={activeFilters.kategorie.includes(k) ? "secondary" : "outline"}
                                size="sm"
                                className="text-xs font-normal hover:bg-accent hover:text-accent-foreground transition-colors rounded-lg h-6"
                                onClick={() => toggleFilter('kategorie', k)}
                              >
                                {Icon ? <span className="mr-1">{Icon}</span> : null}
                                {k.charAt(0).toUpperCase() + k.slice(1)}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="mb-4">
                        <h4 className="font-normal">Betriebstyp</h4>
                        <div className="flex flex-wrap gap-2">
                          {betriebstypOptions.map(b => (
                            <Button
                              key={b}
                              variant={activeFilters.betriebstyp.includes(b) ? "secondary" : "outline"}
                              size="sm"
                              className="text-xs font-normal hover:bg-accent hover:text-accent-foreground transition-colors rounded-lg h-6"
                              onClick={() => toggleFilter('betriebstyp', b)}
                            >
                              {b.charAt(0).toUpperCase() + b.slice(1)}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-normal">Land</h4>
                        <div className="flex flex-wrap gap-2">
                          {landOptions.map(l => (
                            <Button
                              key={l}
                              variant={activeFilters.land.includes(l) ? "secondary" : "outline"}
                              size="sm"
                              className="text-xs font-normal hover:bg-accent hover:text-accent-foreground transition-colors rounded-lg h-6"
                              onClick={() => toggleFilter('land', l)}
                            >
                              {l}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                <CompaniesTable
                  companies={filteredCompanies}
                  onEdit={setEditCompany}
                  onDelete={(company) => {
                    if (confirm("Delete company?")) deleteMutation.mutate(company.id);
                  }}
                />
              </>
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
