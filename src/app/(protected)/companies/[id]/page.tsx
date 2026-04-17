// src/app/(protected)/companies/[id]/page.tsx
// This file defines the Company Detail page of the application, which displays detailed information about a single company.
// It uses server-side rendering to fetch the company data based on the provided ID and renders a client component (CompanyDetailClient) to display the company's details.
// It handles missing IDs with notFound() and soft-deleted firms with a redirect to the list plus a query flag for a toast message.
// Server component for Company Detail page, fetching company data and handling redirection if not found.

import { notFound, redirect } from "next/navigation";
import { resolveCompanyDetail } from "@/lib/actions/companies";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { companiesListSearchStringFromPageSearchParams } from "@/lib/utils/company-filters-url-state";
import CompanyDetailClient from "./CompanyDetailClient";

export default async function CompanyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const resolved = await resolveCompanyDetail(id, supabase);

  if (resolved.kind === "missing") {
    notFound();
  }

  if (resolved.kind === "trashed") {
    redirect("/companies?trashedCompany=1");
  }

  const sp = searchParams ? await searchParams : {};
  const initialAiEnrichOpen = sp?.aiEnrich === "1";
  const initialCompaniesListSearch = companiesListSearchStringFromPageSearchParams(sp);

  return (
    <CompanyDetailClient
      company={resolved.company}
      initialAiEnrichOpen={initialAiEnrichOpen}
      initialCompaniesListSearch={initialCompaniesListSearch}
    />
  );
}
