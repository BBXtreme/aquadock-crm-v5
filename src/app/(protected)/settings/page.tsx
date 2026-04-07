// src/app/(protected)/settings/page.tsx
// This file defines the Settings page of the application, where users can configure various settings related
// to notifications, appearance, OpenMap integration, and SMTP email configuration.

import { Suspense } from "react";
import { SettingsPageSkeleton } from "@/components/ui/page-list-skeleton";
import { requireUser } from "@/lib/auth/require-user";
import ClientSettingsPage from "./ClientSettingsPage";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/30">
      <div className="container mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
        {/* Page Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Einstellungen</h1>
          <p className="text-muted-foreground">
            Verwalte deine Account- und CRM-Einstellungen
          </p>
        </div>

        {/* Welcome line preserved */}
        <div className="text-lg">
          Willkommen, <span className="font-extralight">{safeDisplay(user.display_name)}</span>
        </div>

        <Suspense fallback={<SettingsPageSkeleton />}>
          <ClientSettingsPage />
        </Suspense>
      </div>
    </div>
  );
}
