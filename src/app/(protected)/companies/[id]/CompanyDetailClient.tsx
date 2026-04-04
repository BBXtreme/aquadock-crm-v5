// src/app/(protected)/companies/[id]/CompanyDetailClient.tsx
// This file defines the CompanyDetailClient component, which is responsible for rendering the detailed view of a single company.
// It receives the company data as props and renders various cards and sections related to the company's information, linked contacts, reminders, and timeline events.
// The component also handles any necessary client-side interactions and state management for the company detail view.  
// Client wrapper for Company Detail page, handling interactive parts and sub-queries.

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import AquaDockCard from "@/components/company-detail/AquaDockCard";
import CompanyDetailsCard from "@/components/company-detail/CompanyDetailsCard";
import CompanyHeader from "@/components/company-detail/CompanyHeader";
import CompanyKpiCards from "@/components/company-detail/CompanyKpiCards";
import CrmCard from "@/components/company-detail/CrmCard";
import LinkedContactsCard from "@/components/company-detail/LinkedContactsCard";
import RemindersCard from "@/components/company-detail/RemindersCard";
import TimelineCard from "@/components/company-detail/TimelineCard";
import CompanyEditForm from "@/components/features/companies/CompanyEditForm";
import TimelineEntryForm from "@/components/features/timeline/TimelineEntryForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingState } from "@/components/ui/LoadingState";
import { createClient } from "@/lib/supabase/browser";
import type { Database } from "@/types/database.types";

type Company = Database["public"]["Tables"]["companies"]["Row"];

interface CompanyDetailClientProps {
  company: Company;
}

export default function CompanyDetailClient({ company }: CompanyDetailClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = company.id;

  // Add state for dialogs
  const [editCompanyDialogOpen, setEditCompanyDialogOpen] = useState(false);
  const [addTimelineDialogOpen, setAddTimelineDialogOpen] = useState(false);

  // Fetch companies and contacts for timeline form (similar to TimelineCard)
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("companies").select("id, firmenname, kundentyp");
      if (error) throw error;
      return data;
    },
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("contacts").select("id, vorname, nachname, position, email, telefon");
      if (error) throw error;
      return data;
    },
  });

  // Optional: Keep sub-queries if needed, but remove refetch hacks
  useEffect(() => {
    if (company?.id) {
      queryClient.invalidateQueries({ queryKey: ["contacts", company.id] });
      queryClient.invalidateQueries({ queryKey: ["reminders", company.id] });
    }
  }, [company?.id, queryClient]);

  return (
    <Suspense fallback={<LoadingState count={8} />}>
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        <CompanyHeader
          company={company}
          id={id}
          router={router}
          onAddTimeline={() => setAddTimelineDialogOpen(true)}
          onEdit={() => setEditCompanyDialogOpen(true)}
        />
        <CompanyKpiCards company={company} />    
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          <CompanyDetailsCard company={company} />
          <AquaDockCard company={company} />
          <CrmCard company={company} />
        </div>
        <LinkedContactsCard companyId={id} />
        <RemindersCard companyId={id} />
        <TimelineCard companyId={id} />
      </div>

      {/* Add Edit Company Dialog */}
      <Dialog open={editCompanyDialogOpen} onOpenChange={setEditCompanyDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
          </DialogHeader>
          <CompanyEditForm
            company={company}
            onSuccess={() => {
              setEditCompanyDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ["company", id] });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Add Timeline Dialog */}
      <Dialog open={addTimelineDialogOpen} onOpenChange={setAddTimelineDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Timeline Entry</DialogTitle>
          </DialogHeader>
          <TimelineEntryForm
            onSubmit={async (values) => {
              const supabase = createClient();
              // Assume TimelineEntryForm or insert logic handles user_id; add if needed
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
    </Suspense>
  );
}
