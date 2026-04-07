// src/app/(protected)/dashboard/page.tsx
// This file defines the Dashboard page of the application, which displays key performance indicators (KPIs) and visualizations related to companies, contacts, and timeline events.
// The page is protected and requires user authentication before rendering the dashboard content.
// It uses a client component (DashboardClient) to fetch and display the actual statistics and charts, while the server component handles authentication and provides a loading state during data fetching.
// Protected dashboard with real KPI calculations and beautiful visualizations.

import { Suspense } from "react";

import { DashboardContentSkeleton } from "@/components/ui/page-list-skeleton";
import { requireUser } from "@/lib/auth/require-user";
import { safeDisplay } from "@/lib/utils/data-format";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/30">
      <div className="container mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Home → Dashboard</div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-muted-foreground">
              Willkommen, <span className="font-medium text-foreground">{safeDisplay(user.display_name)}</span>
            </p>
          </div>
        </div>

        <Suspense fallback={<DashboardContentSkeleton />}>
          <DashboardClient />
        </Suspense>
      </div>
    </div>
  );
}
