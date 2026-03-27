"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import AdresseCard from "@/components/company-detail/AdresseCard";
import AquaDockCard from "@/components/company-detail/AquaDockCard";
import CompanyHeader from "@/components/company-detail/CompanyHeader";
import CompanyKpiCards from "@/components/company-detail/CompanyKpiCards";
import CrmCard from "@/components/company-detail/CrmCard";
import FirmendatenCard from "@/components/company-detail/FirmendatenCard";
import LinkedContactsCard from "@/components/company-detail/LinkedContactsCard";
import RemindersCard from "@/components/company-detail/RemindersCard";
import TimelineCard from "@/components/company-detail/TimelineCard";
import { createClient } from "@/lib/supabase/browser";
import type { Company } from "@/lib/supabase/database.types";
import { getCompanyById } from "@/lib/supabase/services/companies";

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const queryClient = useQueryClient();

  const {
    data: company,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["company", id],
    queryFn: async () => getCompanyById(id, createClient()),
  });

  if (isLoading) return <div className="container mx-auto p-6">Loading company details...</div>;
  if (error || !company) {
    return (
      <div className="container mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold text-red-600">Company not found</h1>
        <button onClick={() => router.push("/companies")} className="mt-4 text-blue-600 hover:underline">
          Back to Companies
        </button>
      </div>
    );
  }

  return (
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
      <RemindersCard reminders={[]} onAdd={() => {}} onEdit={() => {}} onDelete={() => {}} />
      <TimelineCard timeline={[]} onAdd={() => {}} onEdit={() => {}} onDelete={() => {}} />
    </div>
  );
}
