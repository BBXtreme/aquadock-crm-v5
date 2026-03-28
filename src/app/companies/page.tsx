"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Anchor,
  Building,
  Building2,
  DollarSign,
  Eye,
  Handshake,
  Palmtree,
  RefreshCw,
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
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";

import CompanyCreateForm from "@/components/features/CompanyCreateForm";
import CompanyEditForm from "@/components/features/CompanyEditForm";
import CompaniesTable from "@/components/tables/CompaniesTable";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LoadingState } from "@/components/ui/LoadingState";
import { StatCard } from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { WideDialogContent } from "@/components/ui/wide-dialog";
import { createClient } from "@/lib/supabase/browser";
import type { Company, Contact } from "@/lib/supabase/database.types";
import { deleteCompany, getCompanies, updateCompany } from "@/lib/supabase/services/companies";
import { cn } from "@/lib/utils";

type FilterGroup = "status" | "kategorie" | "betriebstyp" | "land";

type CompanyWithContacts = Company & { contacts?: Contact[] };

export default function CompaniesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const [sorting, setSorting] = useState<{ id: string; desc: boolean }[]>([{ id: "firmenname", desc: false }]);

  const [activeFilters, setActiveFilters] = useState<Record<FilterGroup, string[]>>({
    status: [],
    kategorie: [],
    betriebstyp: [],
    land: [],
  });
  const [globalFilter, setGlobalFilter] = useState<string>("");

  const statusOptions = [
    "lead",
    "interessant",
    "qualifiziert",
    "akquise",
    "angebot",
    "gewonnen",
    "verloren",
    "kunde",
    "partner",
    "inaktiv",
  ] as const;

  const kategorieOptions = [
    "restaurant",
    "hotel",
    "resort",
    "camping",
    "marina",
    "segelschule",
    "segelverein",
    "bootsverleih",
    "neukunde",
    "bestandskunde",
    "interessent",
    "partner",
    "sonstige",
  ] as const;

  const betriebstypOptions = ["kette", "einzeln"] as const;

  const landOptions = [
    "Deutschland",
    "Österreich",
    "Schweiz",
    "Frankreich",
    "Italien",
    "Spanien",
    "Niederlande",
    "Belgien",
    "Dänemark",
    "Schweden",
    "Norwegen",
    "Polen",
    "Ungarn",
    "Griechenland",
    "Portugal",
    "Großbritannien",
  ] as const;

  const statusIcons: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>> | null> = {
    lead: Sparkles,
    gewonnen: Trophy,
    verloren: XCircle,
  };

  const kategorieIcons: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>> | null> = {
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

  const toggleFilter = (group: FilterGroup, value: string) => {
    setActiveFilters((prev) => ({
      ...prev,
      [group]: prev[group].includes(value) ? prev[group].filter((v) => v !== value) : [...prev[group], value],
    }));
  };

  const removeFilter = (group: FilterGroup, value: string) => {
    setActiveFilters((prev) => ({
      ...prev,
      [group]: prev[group].filter((v) => v !== value),
    }));
  };

  const {
    data: companiesData,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["companies", pagination.pageIndex, pagination.pageSize, activeFilters, sorting],
    queryFn: async () => {
      const supabase = createClient();
      return getCompanies(supabase, {
        page: pagination.pageIndex,
        pageSize: pagination.pageSize,
        statusFilters: activeFilters.status.length > 0 ? activeFilters.status : undefined,
        kundentypFilters: activeFilters.kategorie.length > 0 ? activeFilters.kategorie : undefined,
        firmentypFilters: activeFilters.betriebstyp.length > 0 ? activeFilters.betriebstyp : undefined,
        landFilters: activeFilters.land.length > 0 ? activeFilters.land : undefined,
        sortBy: sorting[0]?.id,
        sortDesc: sorting[0]?.desc,
      });
    },
    // Reliable refresh behavior (exactly like TimelineCard)
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    // Keep cache for fast navigation, but always fetch fresh on hard refresh
    gcTime: 5 * 60 * 1000,
  });

  const companies = companiesData?.data || [];
  const total = companiesData?.total || 0;
  const pageCount = Math.ceil(total / pagination.pageSize);

  const { data: statsData } = useQuery({
    queryKey: ["companies-stats"],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase.from("companies").select("status, value");
      const total = data?.length || 0;
      const leads = data?.filter((c) => c.status === "lead").length || 0;
      const won = data?.filter((c) => c.status === "gewonnen").length || 0;
      const value = data?.reduce((sum, c) => sum + (c.value ?? 0), 0) || 0;
      return { total, leads, won, value };
    },
  });

  const stats = statsData || { total: 0, leads: 0, won: 0, value: 0 };

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Company> }) => updateCompany(id, updates),
    onMutate: async ({ id, updates }) => {
      const queryKey = ["companies", pagination.pageIndex, pagination.pageSize, activeFilters, sorting];
      await queryClient.cancelQueries({ queryKey });
      const previousCompanies = queryClient.getQueryData<{ data: CompanyWithContacts[]; total: number }>(queryKey);
      if (previousCompanies) {
        queryClient.setQueryData(queryKey, {
          ...previousCompanies,
          data: previousCompanies.data.map((company) => (company.id === id ? { ...company, ...updates } : company)),
        });
      }
      return { previousCompanies, queryKey };
    },
    onError: (err, _variables, context) => {
      if (context?.previousCompanies && context.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousCompanies);
      }
      const message = err instanceof Error ? err.message : "An unknown error occurred";
      toast.error("Update failed", { description: message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company updated");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCompany,
    onMutate: async (id) => {
      const queryKey = ["companies", pagination.pageIndex, pagination.pageSize, activeFilters, sorting];
      await queryClient.cancelQueries({ queryKey });
      const previousCompanies = queryClient.getQueryData<{ data: CompanyWithContacts[]; total: number }>(queryKey);
      if (previousCompanies) {
        queryClient.setQueryData(queryKey, {
          data: previousCompanies.data.filter((company) => company.id !== id),
          total: previousCompanies.total - 1,
        });
      }
      return { previousCompanies, queryKey };
    },
    onError: (err, _id, context) => {
      if (context?.previousCompanies && context.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousCompanies);
      }
      const message = err instanceof Error ? err.message : "An unknown error occurred";
      toast.error("Deletion failed", { description: message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company deleted");
    },
  });

  if (queryError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Home → Companies</p>
              <h1 className="font-semibold text-3xl tracking-tight">Companies</h1>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>New Company</Button>
              </DialogTrigger>
              <WideDialogContent size="2xl">
                <DialogHeader>
                  <DialogTitle>Create New Company</DialogTitle>
                </DialogHeader>
                <CompanyCreateForm onSuccess={() => setDialogOpen(false)} />
              </WideDialogContent>
            </Dialog>
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
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between pb-6 border-b">
          <div>
            <div className="text-sm text-muted-foreground">Home → Companies</div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Companies
            </h1>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>New Company</Button>
            </DialogTrigger>
            <WideDialogContent size="2xl">
              <DialogHeader>
                <DialogTitle>Create New Company</DialogTitle>
              </DialogHeader>
              <CompanyCreateForm
                onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ["companies"] });
                  queryClient.invalidateQueries({ queryKey: ["companies-stats"] });
                  setDialogOpen(false);
                }}
              />
            </WideDialogContent>
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

        {/* Table Section */}
        <Card className="border-border rounded-xl shadow-sm">
          <CardContent className="p-6">
            {isLoading ? (
              <LoadingState type="table" count={6} itemClassName="h-14 w-full" />
            ) : (
              <>
                {/* Active Filters Badges */}
                <div
                  className={cn(
                    "flex flex-wrap gap-2 items-center",
                    Object.values(activeFilters).flat().length === 0 ? "mt-1" : "mt-4",
                  )}
                >
                  {Object.entries(activeFilters).map(([group, values]) =>
                    values.map((v) => (
                      <Badge
                        key={`${group}-${v}`}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {v}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeFilter(group as FilterGroup, v)}
                        />
                      </Badge>
                    )),
                  )}
                  {Object.values(activeFilters).flat().length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setActiveFilters({
                          status: [],
                          kategorie: [],
                          betriebstyp: [],
                          land: [],
                        })
                      }
                    >
                      Clear all
                    </Button>
                  )}
                </div>

                <Accordion type="single" collapsible className="mb-4">
                  <AccordionItem>
                    <AccordionTrigger open={accordionOpen} setOpen={setAccordionOpen}>
                      Filters ({Object.values(activeFilters).flat().length})
                    </AccordionTrigger>
                    <AccordionContent open={accordionOpen} setOpen={setAccordionOpen}>
                      {/* Status */}
                      <div className="mb-4">
                        <h4 className="font-normal mb-2">Status</h4>
                        <div className="flex flex-wrap gap-2">
                          {statusOptions.map((s) => {
                            const Icon = statusIcons[s];
                            const isActive = activeFilters.status.includes(s);
                            return (
                              <Button
                                key={s}
                                variant={isActive ? "secondary" : "ghost"}
                                size="sm"
                                className={
                                  isActive
                                    ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                                }
                                onClick={() => toggleFilter("status", s)}
                              >
                                {Icon && <Icon className="mr-1.5 h-3.5 w-3.5" />}
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                              </Button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Kategorie */}
                      <div className="mb-4">
                        <h4 className="font-normal mb-2">Kategorie</h4>
                        <div className="flex flex-wrap gap-2">
                          {kategorieOptions.map((k) => {
                            const Icon = kategorieIcons[k];
                            const isActive = activeFilters.kategorie.includes(k);
                            return (
                              <Button
                                key={k}
                                variant={isActive ? "secondary" : "ghost"}
                                size="sm"
                                className={
                                  isActive
                                    ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                                }
                                onClick={() => toggleFilter("kategorie", k)}
                              >
                                {Icon && <Icon className="mr-1.5 h-3.5 w-3.5" />}
                                {k.charAt(0).toUpperCase() + k.slice(1)}
                              </Button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Betriebstyp */}
                      <div className="mb-4">
                        <h4 className="font-normal mb-2">Betriebstyp</h4>
                        <div className="flex flex-wrap gap-2">
                          {betriebstypOptions.map((b) => {
                            const isActive = activeFilters.betriebstyp.includes(b);
                            return (
                              <Button
                                key={b}
                                variant={isActive ? "secondary" : "ghost"}
                                size="sm"
                                className={
                                  isActive
                                    ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                                }
                                onClick={() => toggleFilter("betriebstyp", b)}
                              >
                                {b.charAt(0).toUpperCase() + b.slice(1)}
                              </Button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Land */}
                      <div>
                        <h4 className="font-normal mb-2">Land</h4>
                        <div className="flex flex-wrap gap-2">
                          {landOptions.map((l) => {
                            const isActive = activeFilters.land.includes(l);
                            return (
                              <Button
                                key={l}
                                variant={isActive ? "secondary" : "ghost"}
                                size="sm"
                                className={
                                  isActive
                                    ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                                }
                                onClick={() => toggleFilter("land", l)}
                              >
                                {l}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <CompaniesTable
                  companies={companies}
                  globalFilter={globalFilter}
                  onGlobalFilterChange={setGlobalFilter}
                  onEdit={(company) => updateMutation.mutate({ id: company.id, updates: company })}
                  onDelete={(companyOrId) => {
                    const id = typeof companyOrId === "string" ? companyOrId : companyOrId.id;
                    deleteMutation.mutate(id);
                  }}
                  pageCount={pageCount}
                  onPaginationChange={setPagination}
                  sorting={sorting}
                  onSortingChange={setSorting}
                />
              </>
            )}
          </CardContent>
        </Card>

        {editCompany && <CompanyEditForm company={editCompany} onSuccess={() => setEditCompany(null)} />}
      </div>
    </div>
  );
}
