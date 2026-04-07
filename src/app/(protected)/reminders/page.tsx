// src/app/(protected)/reminders/page.tsx
// This file defines the Reminders page of the application, which displays a list of reminders and allows users to create, edit, and delete reminders.
// It uses React Query to fetch reminder data from the server and manage state for creating, updating, and deleting reminders.
// The page includes a dialog for creating and editing reminders, as well as a confirmation dialog for deletions.
// Each reminder displays relevant information such as title, description, due date, priority, status, and assigned user.
// The page also handles loading and error states, providing feedback to the user accordingly.

import { Suspense } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth/require-user";
import ClientRemindersPage from "./ClientRemindersPage";

function RemindersPageSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 pb-6 border-b sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-9 w-52 max-w-full" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-10 w-36 shrink-0 rounded-md" />
      </div>

      <div className="grid grid-cols-1 gap-4 pb-6 md:grid-cols-4">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>

      <div className="flex flex-wrap items-center gap-2 pb-4">
        <Skeleton className="h-8 w-14 rounded-md" />
        <Skeleton className="h-8 w-16 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {["reminders-skel-1", "reminders-skel-2", "reminders-skel-3", "reminders-skel-4", "reminders-skel-5"].map(
            (key) => (
              <div key={key} className="flex gap-4 rounded-lg border border-border bg-card/50 p-4">
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Skeleton className="h-5 w-48 max-w-full" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-3 w-36" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Skeleton className="h-9 w-9 rounded-md" />
                  <Skeleton className="h-9 w-9 rounded-md" />
                </div>
              </div>
            ),
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default async function RemindersPage() {
  const _user = await requireUser();

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/30">
      <div className="container mx-auto space-y-8 p-6 sm:p-6 lg:p-8">
        <Suspense fallback={<RemindersPageSkeleton />}>
          <ClientRemindersPage />
        </Suspense>
      </div>
    </div>
  );
}
