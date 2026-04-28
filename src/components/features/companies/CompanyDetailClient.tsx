// src/components/features/companies/CompanyDetailClient.tsx
// Client wrapper for Company Detail page, handling interactive parts and sub-queries.

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState, useTransition } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageShell } from "@/components/ui/page-shell";
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
}

function CompanyDetailShell({
  company,
  ownerDisplayLine = null,
  initialAiEnrichOpen = false,
  initialCompaniesListSearch = "",
}: CompanyDetailClientProps) {
  const tCompanies = useT("companies");
  const tTimeline = useT("timeline");
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [, startTransition] = useTransition();
  const id = company.id;

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
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  const [editCompanyDialogOpen, setEditCompanyDialogOpen] = useState(false);
  const [addTimelineDialogOpen, setAddTimelineDialogOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(initialAiEnrichOpen);
  const [aiPrefill, setAiPrefill] = useState<{ version: number; patch: Partial<CompanyForm> } | null>(null);

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
  }, []);

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

  useEffect(() => {
    if (company?.id) {
      queryClient.invalidateQueries({ queryKey: ["contacts", company.id] });
      queryClient.invalidateQueries({ queryKey: ["reminders", company.id] });
    }
  }, [company?.id, queryClient]);

  const handleAiApplyPatch = (patch: Partial<CompanyForm>) => {
    setAiPrefill({ version: Date.now(), patch });
    setEditCompanyDialogOpen(true);
  };

  return (
    <>
      <CompanyHeader
        company={company}
        id={id}
        router={router}
        companiesListSearchParams={companiesListSearchParams}
        hasListNavContext={hasListNavContext}
        prevCompanyId={prevCompanyId}
        nextCompanyId={nextCompanyId}
        listNavIdsLoading={hasListNavContext && listNavIdsPending}
        ownerDisplayLine={ownerDisplayLine}
        onAddTimeline={() => setAddTimelineDialogOpen(true)}
        onEdit={() => setEditCompanyDialogOpen(true)}
        onAiEnrich={() => setAiModalOpen(true)}
      />
      <CompanyKpiCards company={company} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
        <CompanyDetailsCard company={company} onCompanyUpdated={refreshCompanyDetail} />
        <AquaDockCard company={company} onCompanyUpdated={refreshCompanyDetail} />
        <CrmCard company={company} />
      </div>
      <LinkedContactsCard companyId={id} />
      <RemindersCard companyId={id} />
      <CompanyCommentsCard companyId={id} />
      <CompanyCommentAttachmentsCard companyId={id} />
      <TimelineCard companyId={id} />

      <AIEnrichmentModal
        company={company}
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
            company={company}
            aiPrefill={aiPrefill}
            onAiPrefillConsumed={() => setAiPrefill(null)}
            onRequestAiEnrich={() => setAiModalOpen(true)}
            onSuccess={() => {
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
      <Suspense fallback={<LoadingState count={8} />}>
        <CompanyDetailShell {...props} />
      </Suspense>
    </PageShell>
  );
}
