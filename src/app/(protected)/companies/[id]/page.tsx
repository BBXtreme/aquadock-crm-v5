// src/app/(protected)/companies/[id]/page.tsx
// This file defines the Company Detail page of the application, which displays detailed information about a single company.
// It uses server-side rendering to fetch the company data based on the provided ID and renders a client component (CompanyDetailClient) to display the company's details.
// It handles missing IDs with notFound() and soft-deleted firms with a redirect to the list plus a query flag for a toast message.
// Server component for Company Detail page, fetching company data and handling redirection if not found.

import { notFound, redirect } from "next/navigation";
import { resolveCompanyDetail } from "@/lib/actions/companies";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import CompanyDetailClient from "./CompanyDetailClient";

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const resolved = await resolveCompanyDetail(id, supabase);

  if (resolved.kind === "missing") {
    notFound();
  }

  if (resolved.kind === "trashed") {
    redirect("/companies?trashedCompany=1");
  }

  return <CompanyDetailClient company={resolved.company} />;
}
