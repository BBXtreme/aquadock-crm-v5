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
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth/require-user";
import ClientCompaniesPage from "./ClientCompaniesPage";

export default async function CompaniesPage() {
  const _user = await requireUser();

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/30">
      <div className="container mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
        {/* Nice Loading Skeleton for Companies */}
        <Suspense
          fallback={
            <div className="space-y-8">
              {/* Stats Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Skeleton key="companies-stat-1" className="h-28 rounded-2xl" />
                <Skeleton key="companies-stat-2" className="h-28 rounded-2xl" />
                <Skeleton key="companies-stat-3" className="h-28 rounded-2xl" />
                <Skeleton key="companies-stat-4" className="h-28 rounded-2xl" />
              </div>

              {/* Companies Table / Card Skeleton */}
              <div className="space-y-4">
                {['row1', 'row2', 'row3', 'row4', 'row5', 'row6', 'row7', 'row8'].map((key) => (
                  <div
                    key={`companies-skeleton-${key}`}
                    className="flex items-center gap-6 p-6 border border-border bg-card rounded-2xl"
                  >
                    <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-5 w-80" />
                        <Skeleton className="h-5 w-28 rounded-full" />
                      </div>
                      <div className="flex gap-8">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-9 w-9 rounded-lg" />
                      <Skeleton className="h-9 w-9 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          }
        >
          <ClientCompaniesPage />
        </Suspense>
      </div>
    </div>
  );
}
