// src/app/(protected)/dashboard/page.tsx
// This file defines the Dashboard page of the application, which displays key performance indicators (KPIs) and visualizations related to companies, contacts, and timeline events.
// The page is protected and requires user authentication before rendering the dashboard content.
// It uses a client component (DashboardClient) to fetch and display the actual statistics and charts, while the server component handles authentication and provides a loading state during data fetching.
// Protected dashboard with real KPI calculations and beautiful visualizations.

import { Suspense } from "react";

import { DashboardContentSkeleton } from "@/components/ui/page-list-skeleton";
import { requireUser } from "@/lib/auth/require-user";
import DashboardClient from "./DashboardClient";
import { DashboardPageHeader } from "./DashboardPageHeader";

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/30">
      <div className="container mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
        <DashboardPageHeader displayName={user.display_name} />

        <Suspense fallback={<DashboardContentSkeleton />}>
          <DashboardClient />
        </Suspense>
      </div>
    </div>
  );
}
