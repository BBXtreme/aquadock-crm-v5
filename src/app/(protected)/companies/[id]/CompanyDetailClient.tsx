// src/app/(protected)/companies/[id]/CompanyDetailClient.tsx
// This file defines the CompanyDetailClient component, which is responsible for rendering the detailed view of a single company.
// It receives the company data as props and renders various cards and sections related to the company's information, linked contacts, reminders, and timeline events.
// The component also handles any necessary client-side interactions and state management for the company detail view.  
// Client wrapper for Company Detail page, handling interactive parts and sub-queries.

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import AquaDockCard from "@/components/company-detail/AquaDockCard";
import CompanyDetailsCard from "@/components/company-detail/CompanyDetailsCard";
import CompanyHeader from "@/components/company-detail/CompanyHeader";
import CompanyKpiCards from "@/components/company-detail/CompanyKpiCards";
import CrmCard from "@/components/company-detail/CrmCard";
import LinkedContactsCard from "@/components/company-detail/LinkedContactsCard";
import RemindersCard from "@/components/company-detail/RemindersCard";
import TimelineCard from "@/components/company-detail/TimelineCard";
import { LoadingState } from "@/components/ui/LoadingState";
import type { Database } from "@/types/database.types";

type Company = Database["public"]["Tables"]["companies"]["Row"];

interface CompanyDetailClientProps {
  company: Company;
}

export default function CompanyDetailClient({ company }: CompanyDetailClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = company.id;

  // Optional: Keep sub-queries if needed, but remove refetch hacks
  useEffect(() => {
    if (company?.id) {
      queryClient.invalidateQueries({ queryKey: ["contacts", company.id] });
      queryClient.invalidateQueries({ queryKey: ["reminders", company.id] });
    }
  }, [company?.id, queryClient]);

  return (
    <Suspense fallback={<LoadingState count={8} />}>
      <div className="container mx-auto p-6 space-y-8">
        <CompanyHeader company={company} id={id} router={router} onAddTimeline={() => { /* TODO: implement add timeline */ }} onEdit={() => { /* TODO: implement edit */ }} />
        <CompanyKpiCards company={company} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <CompanyDetailsCard company={company} />
          <AquaDockCard company={company} />
          <CrmCard company={company} />
        </div>
        <LinkedContactsCard companyId={id} />
        <RemindersCard companyId={id} />
        <TimelineCard companyId={id} />
      </div>
    </Suspense>
  );
}
