// src/app/companies/[id]/page.tsx

// This file defines the Company Detail page of the application, which displays detailed information about a specific company.
// It uses React Query to fetch the company data from the server based on the company ID from the URL parameters.
// The page includes sections for company details, linked contacts, reminders, and timeline activities, with options to edit the
// company information and navigate to related pages. It also handles loading and error states, providing appropriate feedback
// to the user. The company data includes fields such as name, address, contact details, status, category, and associated contacts,
// and associated reminders, and associated timeline activities, which are displayed in various cards and sections on the page.

// The page allows users to view comprehensive information about a company and manage related contacts and activities
// within the CRM system.

// Note: This file is a client component because it uses React state and effects to manage the company data and interactions.
// The company data is fetched from the Supabase backend, and updates to the company (such as editing details) are also sent
// to the backend, with the UI updating accordingly based on the response. The page is designed to provide a comprehensive
// view of a company's information and related activities within the CRM system.

//There is still a error in this file, where the data in the linked contacts and reminders cards is not shown after
// first rendering e.g. hard refresh, but only when e.g. the browser windows are switched back and forth to the id company page.
// This is likely due to the fact that the data for these cards is fetched in separate queries that depend on the company ID,
// and there may be a timing issue with when the company data is available and when the related data is fetched.
// To fix this, we can maybe add some additional logic to ensure that the related data is refetched or invalidated when the
// company data is loaded or updated, ensuring that the linked contacts and reminders cards always have the latest data when
// the page is rendered. To be analyzed in more detail and fixed in the next iteration, but for now we can ignore this issue
// as it does not affect the overall functionality of the page.

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import AdresseCard from "@/components/company-detail/AdresseCard";
import AquaDockCard from "@/components/company-detail/AquaDockCard";
import CompanyHeader from "@/components/company-detail/CompanyHeader";
import CompanyKpiCards from "@/components/company-detail/CompanyKpiCards";
import CrmCard from "@/components/company-detail/CrmCard";
import FirmendatenCard from "@/components/company-detail/FirmendatenCard";
import LinkedContactsCard from "@/components/company-detail/LinkedContactsCard";
import RemindersCard from "@/components/company-detail/RemindersCard";
import TimelineCard from "@/components/company-detail/TimelineCard";
import { createClient } from "@/lib/supabase/browser-client";
import { getCompanyById } from "@/lib/supabase/services/companies";

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const queryClient = useQueryClient();

  console.log("Company page id:", id);

  const {
    data: company,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["company", id],
    queryFn: async () => getCompanyById(id, createClient()),
  });

  useEffect(() => {
    if (company?.id) {
      // Force immediate refetch with higher priority
      queryClient.refetchQueries({
        queryKey: ["contacts", company.id],
        type: "active",
      });
      queryClient.refetchQueries({
        queryKey: ["reminders", company.id],
        type: "active",
      });

      // Also invalidate to mark as fresh
      queryClient.invalidateQueries({ queryKey: ["contacts", company.id] });
      queryClient.invalidateQueries({ queryKey: ["reminders", company.id] });
    }
  }, [company?.id, queryClient]);

  useEffect(() => {
    if (company?.id) {
      // Force fresh data for sub-cards on initial mount / hard reload
      queryClient.refetchQueries({
        queryKey: ["contacts", company.id],
        type: "all",
      });
      queryClient.refetchQueries({
        queryKey: ["reminders", company.id],
        type: "all",
      });
    }
  }, [company?.id, queryClient]);

  useEffect(() => {
    if (company?.id) {
      setTimeout(() => {
        queryClient.refetchQueries({
          queryKey: ["contacts", company.id],
          type: "all",
        });
        queryClient.refetchQueries({
          queryKey: ["reminders", company.id],
          type: "all",
        });
      }, 150); // small delay to ensure mount is complete
    }
  }, [company?.id, queryClient]);

  if (isLoading) return <div className="container mx-auto p-6">Loading company details...</div>;
  if (error || !company) {
    return (
      <div className="container mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold text-red-600">Company not found</h1>
        <button type="button" onClick={() => router.push("/companies")} className="mt-4 text-blue-600 hover:underline">
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
      <RemindersCard companyId={id} />
      <TimelineCard companyId={id} />
    </div>
  );
}
