// src/app/(protected)/mass-email/templates/page.tsx
// This file defines the TemplatesPage component, which is the main page for managing email templates in the mass email section of the application. It uses Suspense to load the TemplatesClient component, which handles the interactive parts of the templates management.
import { Suspense } from "react";
import TemplatesClient from "@/components/tables/EmailTemplatesClient";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth/require-user";

export default async function TemplatesPage() {
  await requireUser();

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/30">
      <div className="container mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
        {/* Page Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">E-Mail Vorlagen</h1>
          <p className="text-muted-foreground">
            Verwalte wiederverwendbare E-Mail-Vorlagen für Massenversand und Schnellmails
          </p>
        </div>

        {/* Nice Loading Skeleton for Email Templates */}
        <Suspense
          fallback={
            <div className="space-y-8">
              {/* Header / Action Bar */}
              <div className="flex items-center justify-between">
                <Skeleton key="templates-header-1" className="h-9 w-64" />
                <Skeleton key="templates-header-2" className="h-10 w-40 rounded-xl" />
              </div>

              {/* Templates Table Skeleton */}
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                {/* Table Header */}
                <div className="border-b border-border px-8 py-5">
                  <div className="grid grid-cols-12 gap-4">
                    <Skeleton className="h-5 col-span-5" />
                    <Skeleton className="h-5 col-span-4" />
                    <Skeleton className="h-5 col-span-3" />
                  </div>
                </div>

                {/* Table Rows */}
                <div className="divide-y divide-border">
                  {['row1', 'row2', 'row3', 'row4', 'row5', 'row6'].map((key) => (
                    <div
                      key={`templates-skeleton-${key}`}
                      className="px-8 py-6 grid grid-cols-12 gap-4 items-center"
                    >
                      <div className="col-span-5">
                        <Skeleton className="h-5 w-4/5" />
                        <Skeleton className="h-4 w-3/5 mt-2" />
                      </div>
                      <div className="col-span-4">
                        <Skeleton className="h-4 w-full" />
                      </div>
                      <div className="col-span-3 flex justify-end gap-3">
                        <Skeleton className="h-9 w-9 rounded-lg" />
                        <Skeleton className="h-9 w-9 rounded-lg" />
                        <Skeleton className="h-9 w-9 rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          }
        >
          <TemplatesClient />
        </Suspense>
      </div>
    </div>
  );
}
