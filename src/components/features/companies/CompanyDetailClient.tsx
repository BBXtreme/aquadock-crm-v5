// src/components/features/companies/CompanyDetailClient.tsx
// Client wrapper for Company Detail page, handling interactive parts and sub-queries.

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { AIEnrichmentModal } from "@/components/features/companies/ai-enrichment/AIEnrichmentModal";
import CompanyEditForm from "@/components/features/companies/CompanyEditForm";
import AquaDockCard from "@/components/features/companies/detail/AquaDockCard";
import CompanyCommentAttachmentsCard from "@/components/features/companies/detail/CompanyCommentAttachmentsCard";
import CompanyCommentsCard from "@/components/features/companies/detail/CompanyCommentsCard";
import CompanyDetailsCard from "@/components/features/companies/detail/CompanyDetailsCard";
import CompanyHeader from "@/components/features/companies/detail/CompanyHeader";
import CompanyKpiCards from "@/components/features/companies/detail/CompanyKpiCards";
import CrmCard from "@/components/features/companies/detail/CrmCard";
import LinkedContactsCard from "@/components/features/companies/detail/LinkedContactsCard";
import RemindersCard from "@/components/features/companies/detail/RemindersCard";
import TimelineCard from "@/components/features/companies/detail/TimelineCard";
import TimelineEntryForm from "@/components/features/timeline/TimelineEntryForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CompanyDetailPageSkeleton } from "@/components/ui/page-list-skeleton";
import { PageShell } from "@/components/ui/page-shell";
import type { OwnerScopedEditViewer } from "@/lib/auth/owner-scoped-edit-permission";
import { useT } from "@/lib/i18n/use-translations";
import { createClient } from "@/lib/supabase/browser";
import {
  companiesListStateKey,
  extractCompaniesListSearchParamsString,
  hasAnyCompaniesListParamKey,
  parseCompaniesListState,
} from "@/lib/utils/company-filters-url-state";
import type { CompanyForm } from "@/lib/validations/company";
import { resolveActivityTypeForTimelinePersist } from "@/lib/validations/timeline";
import type { Database } from "@/types/database.types";

type Company = Database["public"]["Tables"]["companies"]["Row"];

export interface CompanyDetailClientProps {
  company: Company;
  /** Pre-rendered „Verantwortlich: …“ from RSC; null/omit when no owner */
  ownerDisplayLine?: string | null;
  initialAiEnrichOpen?: boolean;
  /** List-only query string from the server (no `?`); mirrors URL when opened from /companies */
  initialCompaniesListSearch?: string;
  /** Server-computed: matches RLS owner/admin write rules */
  canEditCompany: boolean;
  /** Viewer identity for per-record permission checks on child cards */
  editPermissionViewer: OwnerScopedEditViewer;
}

function CompanyDetailShell({
  company,
  ownerDisplayLine = null,
  initialAiEnrichOpen = false,
  initialCompaniesListSearch = "",
  canEditCompany,
  editPermissionViewer,
}: CompanyDetailClientProps) {
  const tCompanies = useT("companies");
  const tTimeline = useT("timeline");
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const id = company.id;
  const [displayCompany, setDisplayCompany] = useState(company);

  useEffect(() => {
    setDisplayCompany(company);
  }, [company]);

  const companiesListSearchParams = useMemo(() => {
    const fromUrl = extractCompaniesListSearchParamsString(searchParams);
    if (fromUrl.length > 0) {
      return fromUrl;
    }
    return initialCompaniesListSearch.trim();
  }, [searchParams, initialCompaniesListSearch]);

  const hasListNavContext = useMemo(() => {
    if (companiesListSearchParams.length > 0) {
      return true;
    }
    return hasAnyCompaniesListParamKey(searchParams);
  }, [companiesListSearchParams, searchParams]);

  const listStateForNav = useMemo(() => {
    return parseCompaniesListState(new URLSearchParams(companiesListSearchParams));
  }, [companiesListSearchParams]);

  const refreshCompanyDetail = useCallback(() => {
    router.refresh();
  }, [router]);

  const [editCompanyDialogOpen, setEditCompanyDialogOpen] = useState(false);
  const [addTimelineDialogOpen, setAddTimelineDialogOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(() => initialAiEnrichOpen && canEditCompany);
  const [aiPrefill, setAiPrefill] = useState<{ version: number; patch: Partial<CompanyForm> } | null>(null);

  useEffect(() => {
    if (!canEditCompany) {
      setAiModalOpen(false);
      setEditCompanyDialogOpen(false);
      setAiPrefill(null);
    }
  }, [canEditCompany]);

  useEffect(() => {
    if (!initialAiEnrichOpen) {
      return;
    }
    const sp = new URLSearchParams(searchParams.toString());
    if (sp.get("aiEnrich") !== "1") {
      return;
    }
    sp.delete("aiEnrich");
    const qs = sp.toString();
    router.replace(qs.length > 0 ? `/companies/${id}?${qs}` : `/companies/${id}`, { scroll: false });
  }, [initialAiEnrichOpen, id, router, searchParams]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!canEditCompany) {
        return;
      }
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "e") {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) {
        return;
      }
      event.preventDefault();
      setAiModalOpen(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canEditCompany]);

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("companies")
        .select("id, firmenname, kundentyp")
        .is("deleted_at", null);
      if (error) throw error;
      return data;
    },
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("contacts")
        .select("id, vorname, nachname, position, email, telefon")
        .is("deleted_at", null);
      if (error) throw error;
      return data;
    },
  });
  const { data: relatedStandortanalysen = [] } = useQuery({
    queryKey: ["standortanalysen", "by-company", id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("standortanalysen")
        .select("id,status,updated_at,total_points,recommendation")
        .eq("company_id", id)
        .order("updated_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
    enabled: displayCompany != null,
  });

  const { data: orderedNavIds = [], isPending: listNavIdsPending } = useQuery({
    queryKey: ["company-detail-nav-ids", companiesListStateKey(listStateForNav)],
    enabled: hasListNavContext,
    // Hit the server Route Handler — embedding/semantic env vars live there.
    queryFn: async ({ signal }) => {
      const res = await fetch("/api/companies/nav-ids", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ searchParams: companiesListSearchParams }),
        signal,
      });
      if (!res.ok) {
        throw new Error(`Nav ids fetch failed (${res.status})`);
      }
      const json = (await res.json()) as { ids?: unknown };
      return Array.isArray(json.ids)
        ? json.ids.filter((v): v is string => typeof v === "string")
        : [];
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { prevCompanyId, nextCompanyId } = useMemo(() => {
    if (!hasListNavContext || orderedNavIds.length === 0) {
      return { prevCompanyId: null as string | null, nextCompanyId: null as string | null };
    }
    const idx = orderedNavIds.indexOf(id);
    if (idx < 0) {
      return { prevCompanyId: null, nextCompanyId: null };
    }
    const prev = idx > 0 ? orderedNavIds[idx - 1] : undefined;
    const next = idx < orderedNavIds.length - 1 ? orderedNavIds[idx + 1] : undefined;
    return {
      prevCompanyId: typeof prev === "string" ? prev : null,
      nextCompanyId: typeof next === "string" ? next : null,
    };
  }, [hasListNavContext, orderedNavIds, id]);

  // Phase 1 quick win: the mount-time invalidation of ["contacts", id] and
  // ["reminders", id] was forcing a refetch on every prev/next navigation,
  // even when those queries were still inside their 60s `staleTime`. The
  // individual cards (LinkedContactsCard, RemindersCard, CompanyKpiCards)
  // already invalidate after their own mutations and rely on `staleTime` for
  // background freshness, so removing this effect avoids the extra round
  // trips without changing UX when data changes.

  const handleAiApplyPatch = (patch: Partial<CompanyForm>) => {
    if (!canEditCompany) {
      return;
    }
    setAiPrefill({ version: Date.now(), patch });
    setEditCompanyDialogOpen(true);
  };

  return (
    <>
      <CompanyHeader
        company={displayCompany}
        id={id}
        router={router}
        companiesListSearchParams={companiesListSearchParams}
        hasListNavContext={hasListNavContext}
        prevCompanyId={prevCompanyId}
        nextCompanyId={nextCompanyId}
        listNavIdsLoading={hasListNavContext && listNavIdsPending}
        ownerDisplayLine={ownerDisplayLine}
        canEditCompany={canEditCompany}
        onAddTimeline={() => setAddTimelineDialogOpen(true)}
        onEdit={() => setEditCompanyDialogOpen(true)}
        onAiEnrich={canEditCompany ? () => setAiModalOpen(true) : undefined}
      />
      <CompanyKpiCards company={displayCompany} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
        <CompanyDetailsCard
          company={displayCompany}
          onCompanyUpdated={refreshCompanyDetail}
          canEditCompany={canEditCompany}
        />
        <AquaDockCard
          company={displayCompany}
          onCompanyUpdated={refreshCompanyDetail}
          canEditCompany={canEditCompany}
        />
        <CrmCard company={displayCompany} canEditCompany={canEditCompany} onCompanyUpdated={refreshCompanyDetail} />
      </div>
      <LinkedContactsCard
        companyId={id}
        editPermissionViewer={editPermissionViewer}
        canManageContacts={canEditCompany}
      />
      <Card>
        <CardHeader>
          <CardTitle>Verknüpfte Standortanalysen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {relatedStandortanalysen.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine verknüpften Standortanalysen gefunden.</p>
          ) : (
            relatedStandortanalysen.map((analysis) => (
              <div key={analysis.id} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{analysis.recommendation}</p>
                    <Badge variant="outline">{analysis.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Punkte: {analysis.total_points} · Aktualisiert: {new Date(analysis.updated_at).toLocaleString("de-DE")}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/standortanalyse?analysisId=${analysis.id}`}>Öffnen</Link>
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <RemindersCard
        companyId={id}
        editPermissionViewer={editPermissionViewer}
        canManageReminders={canEditCompany}
      />
      <CompanyCommentsCard companyId={id} />
      <CompanyCommentAttachmentsCard companyId={id} />
      <TimelineCard companyId={id} />

      <AIEnrichmentModal
        company={displayCompany}
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        onApplyPatch={handleAiApplyPatch}
      />

      <Dialog open={editCompanyDialogOpen} onOpenChange={setEditCompanyDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tCompanies("editDialogTitle")}</DialogTitle>
          </DialogHeader>
          <CompanyEditForm
            company={displayCompany}
            aiPrefill={aiPrefill}
            onAiPrefillConsumed={() => setAiPrefill(null)}
            onRequestAiEnrich={() => setAiModalOpen(true)}
            onCancel={() => setEditCompanyDialogOpen(false)}
            onSuccess={(updated) => {
              setDisplayCompany(updated);
              setEditCompanyDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ["company", id] });
              refreshCompanyDetail();
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={addTimelineDialogOpen} onOpenChange={setAddTimelineDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{tTimeline("createDialogTitle")}</DialogTitle>
          </DialogHeader>
          <TimelineEntryForm
            onSubmit={async (values) => {
              const supabase = createClient();
              const activity_type = resolveActivityTypeForTimelinePersist(
                values.activity_type,
                values.title,
                values.content ?? null,
              );
              await supabase.from("timeline").insert({ ...values, activity_type, company_id: id });
              queryClient.invalidateQueries({ queryKey: ["timeline", id] });
              setAddTimelineDialogOpen(false);
            }}
            isSubmitting={false}
            companies={companies}
            contacts={contacts}
            preselectedCompanyId={id}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function CompanyDetailClient(props: CompanyDetailClientProps) {
  return (
    <PageShell>
      <Suspense fallback={<CompanyDetailPageSkeleton />}>
        <CompanyDetailShell {...props} />
      </Suspense>
    </PageShell>
  );
}
