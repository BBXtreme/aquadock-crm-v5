// src/app/(protected)/brevo/page.tsx
import { Suspense } from "react";
import { BrevoMarketingHeader } from "@/components/features/brevo/BrevoMarketingHeader";
import ClientBrevoPage from "@/components/features/brevo/ClientBrevoPage";
import { BrevoMarketingContentSkeleton } from "@/components/ui/page-list-skeleton";
import { PageShell } from "@/components/ui/page-shell";
import { requireUser } from "@/lib/auth/require-user";

export default async function BrevoPage() {
  await requireUser();

  return (
    <PageShell>
      <BrevoMarketingHeader />

      <Suspense fallback={<BrevoMarketingContentSkeleton />}>
        <ClientBrevoPage />
      </Suspense>
    </PageShell>
  );
}
