// src/app/companies/[id]/CompanyDetailClient.tsx
// Client wrapper for Company Detail page, handling interactive parts and sub-queries.

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import AdresseCard from "@/components/company-detail/AdresseCard";
import AquaDockCard from "@/components/company-detail/AquaDockCard";
import CompanyHeader from "@/components/company-detail/CompanyHeader";
import CompanyKpiCards from "@/components/company-detail/CompanyKpiCards";
import CrmCard from "@/components/company-detail/CrmCard";
import FirmendatenCard from "@/components/company-detail/FirmendatenCard";
import LinkedContactsCard from "@/components/company-detail/LinkedContactsCard";
import RemindersCard from "@/components/company-detail/RemindersCard";
import TimelineCard from "@/components/company-detail/TimelineCard";
import { LoadingState } from "@/components/ui/LoadingState";
import type { Database } from "@/lib/supabase/database.types";

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
        <CompanyHeader company={company} id={id} router={router} />
        <CompanyKpiCards company={company} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <FirmendatenCard company={company} />
          <AdresseCard company={company} />
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
