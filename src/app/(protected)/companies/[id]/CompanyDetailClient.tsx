// src/app/(protected)/companies/[id]/CompanyDetailClient.tsx
// Client wrapper for Company Detail page, handling interactive parts and sub-queries.

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useState, useTransition } from "react";
import AquaDockCard from "@/components/company-detail/AquaDockCard";
import CompanyDetailsCard from "@/components/company-detail/CompanyDetailsCard";
import CompanyHeader from "@/components/company-detail/CompanyHeader";
import CompanyKpiCards from "@/components/company-detail/CompanyKpiCards";
import CrmCard from "@/components/company-detail/CrmCard";
import LinkedContactsCard from "@/components/company-detail/LinkedContactsCard";
import RemindersCard from "@/components/company-detail/RemindersCard";
import TimelineCard from "@/components/company-detail/TimelineCard";
import { AIEnrichmentModal } from "@/components/features/companies/ai-enrichment/AIEnrichmentModal";
import CompanyEditForm from "@/components/features/companies/CompanyEditForm";
import TimelineEntryForm from "@/components/features/timeline/TimelineEntryForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingState } from "@/components/ui/LoadingState";
import { PageShell } from "@/components/ui/page-shell";
import { useT } from "@/lib/i18n/use-translations";
import { createClient } from "@/lib/supabase/browser";
import type { CompanyForm } from "@/lib/validations/company";
import type { Database } from "@/types/database.types";

type Company = Database["public"]["Tables"]["companies"]["Row"];

interface CompanyDetailClientProps {
  company: Company;
  initialAiEnrichOpen?: boolean;
}

export default function CompanyDetailClient({ company, initialAiEnrichOpen = false }: CompanyDetailClientProps) {
  const tCompanies = useT("companies");
  const tTimeline = useT("timeline");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [, startTransition] = useTransition();
  const id = company.id;

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
    if (!initialAiEnrichOpen) return;
    router.replace(`/companies/${id}`, { scroll: false });
  }, [initialAiEnrichOpen, id, router]);

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
    <PageShell>
      <Suspense fallback={<LoadingState count={8} />}>
        <CompanyHeader
          company={company}
          id={id}
          router={router}
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
        <TimelineCard companyId={id} />
      </Suspense>

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
              await supabase.from("timeline").insert({ ...values, company_id: id });
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
    </PageShell>
  );
}
