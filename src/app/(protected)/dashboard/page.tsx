// src/app/(protected)/dashboard/page.tsx
// This file defines the Dashboard page of the application, which displays key performance indicators (KPIs) and visualizations related to companies, contacts, and timeline events.
// The page is protected and requires user authentication before rendering the dashboard content.
// It uses a client component (DashboardClient) to fetch and display the actual statistics and charts, while the server component handles authentication and provides a loading state during data fetching.
// Protected dashboard with real KPI calculations and beautiful visualizations.

import { Suspense } from "react";

import { LoadingState } from "@/components/ui/LoadingState";
import { requireUser } from "@/lib/auth/require-user";
import { safeDisplay } from "@/lib/utils/data-format";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  // Auth before data
  const user = await requireUser();

  return (
    <div className="container mx-auto space-y-8 p-6 lg:p-8">
      <div className="flex items-center justify-between pb-6 border-b">
        <div>
          <div className="text-sm text-muted-foreground">Home → Dashboard</div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <div>Welcome, {safeDisplay(user.display_name)}</div>
        </div>
      </div>

      <Suspense fallback={<LoadingState count={6} />}>
        <DashboardClient />
      </Suspense>
    </div>
  );
}
