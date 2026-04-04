// src/app/(protected)/settings/page.tsx
// This file defines the Settings page of the application, where users can configure various settings related
// to notifications, appearance, OpenMap integration, and SMTP email configuration.

import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth/require-user";
import { safeDisplay } from "@/lib/utils/data-format";
import ClientSettingsPage from "./ClientSettingsPage";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/30">
      <div className="container mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
        {/* Page Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">Einstellungen</h1>
          <p className="text-muted-foreground">
            Verwalte deine Account- und CRM-Einstellungen
          </p>
        </div>

        {/* Welcome line preserved */}
        <div className="text-lg">
          Willkommen, <span className="font-medium">{safeDisplay(user.display_name)}</span>
        </div>

        {/* Nice Loading Skeleton for Settings */}
        <Suspense
          fallback={
            <div className="space-y-10">
              {/* Settings Sections Skeleton */}
              <div className="space-y-8">
                {/* Profile Section */}
                <div className="rounded-2xl border border-border bg-card p-8">
                  <Skeleton key="settings-section-1" className="h-7 w-48 mb-6" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-10 w-full rounded-lg" />
                    </div>
                    <div className="space-y-4">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-10 w-full rounded-lg" />
                    </div>
                  </div>
                </div>

                {/* SMTP / Email Section */}
                <div className="rounded-2xl border border-border bg-card p-8">
                  <Skeleton key="settings-section-2" className="h-7 w-64 mb-6" />
                  <div className="space-y-6">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={`settings-smtp-row-${i}`} className="flex gap-4">
                        <Skeleton className="h-10 w-40 flex-shrink-0" />
                        <Skeleton className="h-10 flex-1 rounded-lg" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* General Options */}
                <div className="rounded-2xl border border-border bg-card p-8">
                  <Skeleton key="settings-section-3" className="h-7 w-52 mb-6" />
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-80" />
                      <Skeleton className="h-6 w-12 rounded-full" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-64" />
                      <Skeleton className="h-6 w-12 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
        >
          <ClientSettingsPage />
        </Suspense>
      </div>
    </div>
  );
}