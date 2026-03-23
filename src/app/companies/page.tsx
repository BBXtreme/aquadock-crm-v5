"use client";

import type React from "react";
import { useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Anchor,
  Building,
  Building2,
  DollarSign,
  Edit,
  Eye,
  Handshake,
  Palmtree,
  Sailboat,
  Ship,
  Sparkles,
  Star,
  Tent,
  Trophy,
  Users,
  Utensils,
  XCircle,
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
import { cn } from "@/lib/utils";

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
  const [globalFilter, setGlobalFilter] = useState<string>("");

  const statusOptions = ["lead", "interessant", "qualifiziert", "akquise", "angebot", "gewonnen", "verloren", "kunde", "partner", "inaktiv"];

  const kategorieOptions = [
    "restaurant", "hotel", "resort", "camping", "marina", "segelschule", "segelverein", "bootsverleih", "neukunde", "bestandskunde", "interessent", "partner", "sonstige"
  ];

  const betriebstypOptions = ["kette", "einzeln"];

  const landOptions = [
    "Deutschland", "Österreich", "Schweiz", "Frankreich", "Italien", "Spanien", "Niederlande", "Belgien", "Dänemark", "Schweden", "Norwegen", "Polen", "Ungarn", "Griechenland", "Portugal", "Großbritannien"
  ];

  const statusIcons = {
    lead: Sparkles,
    gewonnen: Trophy,
    verloren: XCircle,
  };

  const kategorieIcons = {
    restaurant: Utensils,
    hotel: Building2,
    resort: Palmtree,
    camping: Tent,
    marina: Anchor,
    segelschule: Sailboat,
    segelverein: Trophy,
    bootsverleih: Ship,
    neukunde: Sparkles,
    bestandskunde: Star,
    interessent: Eye,
    partner: Handshake,
    sonstige: null,
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
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
          <div className="container mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
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
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-between pb-6 border-b">
            <div>
              <div className="text-sm text-muted-foreground">Home → Companies</div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Companies</h1>
            </div>
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

          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Gesamt Firmen"
              value={isLoading ? <Skeleton className="h-8 w-20" /> : stats.total.toLocaleString("de-DE")}
              icon={<Building className="h-5 w-5 text-muted-foreground" />}
              className="border-none shadow-sm bg-card/90 hover:shadow-md"
              change="+12% from last month"
            />
            <StatCard
              title="Leads"
              value={isLoading ? <Skeleton className="h-8 w-20" /> : stats.leads.toLocaleString("de-DE")}
              icon={<Users className="h-5 w-5 text-muted-foreground" />}
              className="border-none shadow-sm bg-card/90 hover:shadow-md"
              change="+8% from last month"
            />
            <StatCard
              title="Gewonnene Deals"
              value={isLoading ? <Skeleton className="h-8 w-20" /> : stats.won.toLocaleString("de-DE")}
              icon={<Trophy className="h-5 w-5 text-muted-foreground" />}
              className="border-none shadow-sm bg-card/90 hover:shadow-md"
              change="+15% from last month"
            />
            <StatCard
              title="Gesamtwert"
              value={isLoading ? <Skeleton className="h-8 w-20" /> : `€${stats.value.toLocaleString("de-DE")}`}
              icon={<DollarSign className="h-5 w-5 text-muted-foreground" />}
              className="border-none shadow-sm bg-card/90 hover:shadow-md"
              change="+22% from last month"
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
                  <div className={cn(
                    "flex flex-wrap gap-2 items-center",
                    Object.values(activeFilters).flat().length === 0 ? "mt-1" : "mt-4"
                  )}>
                    {Object.entries(activeFilters).map(([group, values]) => 
                      values.map(v => (
                        <Badge key={v} variant="secondary" onClick={() => toggleFilter(group, v)}>
                          {v} ×
                        </Badge>
                      ))
                    )}
                    {Object.values(activeFilters).flat().length > 0 && (
                      <Button variant="ghost" size="sm" onClick={() => setActiveFilters({status:[], kategorie:[], betriebstyp:[], land:[]})}>
                        Clear all
                      </Button>
                    )}
                  </div>
                  <Accordion type="single" collapsible className={Object.values(activeFilters).flat().length === 0 ? "mb-2" : "mb-4"}>
                    <AccordionItem value="filters">
                      <AccordionTrigger>Filters ({Object.values(activeFilters).flat().length})</AccordionTrigger>
                      <AccordionContent>
                        <div className="mb-4">
                          <h4 className="font-normal">Status</h4>
                          <div className="flex flex-wrap gap-2">
                            {statusOptions.map(s => {
                              const Icon = statusIcons[s];
                              return (
                                <Button
                                  key={s}
                                  variant={activeFilters.status.includes(s) ? "secondary" : "ghost"}
                                  size="sm"
                                  className={activeFilters.status.includes(s) ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-accent/60"}
                                  onClick={() => toggleFilter('status', s)}
                                >
                                  {Icon && <Icon className="mr-1.5 h-3.5 w-3.5" />}
                                  {s.charAt(0).toUpperCase() + s.slice(1)}
                                </Button>
                              );
                            })}
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
                                  variant={activeFilters.kategorie.includes(k) ? "secondary" : "ghost"}
                                  size="sm"
                                  className={activeFilters.kategorie.includes(k) ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-accent/60"}
                                  onClick={() => toggleFilter('kategorie', k)}
                                >
                                  {Icon && <Icon className="mr-1.5 h-3.5 w-3.5" />}
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
                                variant={activeFilters.betriebstyp.includes(b) ? "secondary" : "ghost"}
                                size="sm"
                                className={activeFilters.betriebstyp.includes(b) ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-accent/60"}
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
                                variant={activeFilters.land.includes(l) ? "secondary" : "ghost"}
                                size="sm"
                                className={activeFilters.land.includes(l) ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-accent/60"}
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
                    globalFilter={globalFilter}
                    onGlobalFilterChange={setGlobalFilter}
                    onEdit={(company) => updateMutation.mutate({ id: company.id, updates: company })}
                    onDelete={(id) => deleteMutation.mutate(id)}
                  />
                </>
              )}
            </CardContent>
          </Card>

          {editCompany && <CompanyEditForm company={editCompany} onSuccess={() => setEditCompany(null)} />}
        </div>
      </div>
    </AppLayout>
  );
}

// Wiederverwendbare Statistik-Karte
function StatCard({ title, value, icon, className, change }: { title: string; value: React.ReactNode; icon: React.ReactNode; className?: string; change?: string }) {
  return (
    <Card className={cn("bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 shadow-sm transition-all duration-200 hover:shadow-lg hover:shadow-primary/15 hover:bg-gradient-to-br hover:from-card hover:to-muted/50", className)}>
      <div className="hover:brightness-105 transition-all">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className="rounded-full bg-muted p-3 flex items-center justify-center">{icon}</div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold tracking-tight text-foreground">{value}</div>
          {change && <p className="text-xs text-green-600">{change}</p>}
        </CardContent>
      </div>
    </Card>
  );
}
