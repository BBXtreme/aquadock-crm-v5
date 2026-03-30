// src/app/companies/[id]/page.tsx

// This file defines the Company Detail page of the application, which displays detailed information about a specific company.
// It fetches the company data server-side and passes it to a client wrapper for rendering.

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server-client";
import { getCompanyById } from "@/lib/supabase/services/companies";
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
