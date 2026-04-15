// s
// This file defines the Companies page of the application, which displays a list of companies and allows users to create,
// edit, and delete companies.
// It uses React Query to fetch company data from the server and manage state for creating, updating, and deleting companies.
// The page includes a dialog for creating new companies and editing existing ones, as well as a confirmation dialog for deletions.
// Each company entry displays relevant information such as name, address, contact details, status, category, and associated contacts.
// The page also includes filtering options for status, category, business type, and country, as well as a global search filter.
// The page handles loading and error states, providing feedback to the user accordingly. The company data is fetched with pagination,
// sorting, and filtering applied based on the user's interactions with the UI. The page also displays key metrics about the companies

import { Suspense } from "react";
import { CompaniesPageSkeleton } from "@/components/ui/page-list-skeleton";
import { PageShell } from "@/components/ui/page-shell";
import { requireUser } from "@/lib/auth/require-user";
import ClientCompaniesPage from "./ClientCompaniesPage";

export default async function CompaniesPage() {
  const _user = await requireUser();

  return (
    <PageShell>
      <Suspense fallback={<CompaniesPageSkeleton />}>
        <ClientCompaniesPage />
      </Suspense>
    </PageShell>
  );
}
