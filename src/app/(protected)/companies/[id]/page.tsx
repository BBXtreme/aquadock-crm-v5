// src/app/(protected)/companies/[id]/page.tsx
// This file defines the Company Detail page of the application, which displays detailed information about a single company.
// It uses server-side rendering to fetch the company data based on the provided ID and renders a client component (CompanyDetailClient) to display the company's details.
// The page also handles redirection if the company is not found, ensuring a smooth user experience when navigating to company details.  
// Server component for Company Detail page, fetching company data and handling redirection if not found.

import { redirect } from "next/navigation";
import { getCompanyById } from "@/lib/actions/companies";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import CompanyDetailClient from "./CompanyDetailClient";

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const company = await getCompanyById(id, supabase);

  if (!company) {
    redirect("/companies");
  }

  return <CompanyDetailClient company={company} />;
}
