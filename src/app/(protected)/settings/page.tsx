// src/app/(protected)/settings/page.tsx
// This file defines the Settings page of the application, where users can configure various settings related
// to notifications, appearance, OpenMap integration, and SMTP email configuration.

import { Suspense } from "react";
import { AIEnrichmentSettingsCard } from "@/components/features/settings/AIEnrichmentSettingsCard";
import { SettingsPageSkeleton } from "@/components/ui/page-list-skeleton";
import { requireUser } from "@/lib/auth/require-user";
import { fetchAiEnrichmentPolicy } from "@/lib/services/ai-enrichment-policy";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import ClientSettingsPage from "./ClientSettingsPage";
import { SettingsPageHeader } from "./SettingsPageHeader";

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = await createServerSupabaseClient();
  const policy = await fetchAiEnrichmentPolicy(supabase, user.id);
  const initialAiEnrichmentSnapshot = {
    enabled: policy.enabled,
    dailyLimit: policy.dailyLimit,
    modelPreference: policy.modelPreference,
    addressFocusPrioritize: policy.addressFocusPrioritize,
    usedToday: policy.usedToday,
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/30">
      <div className="container mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
        <SettingsPageHeader displayName={user.display_name} />

        <AIEnrichmentSettingsCard initialSnapshot={initialAiEnrichmentSnapshot} />

        <Suspense fallback={<SettingsPageSkeleton />}>
          <ClientSettingsPage />
        </Suspense>
      </div>
    </div>
  );
}
