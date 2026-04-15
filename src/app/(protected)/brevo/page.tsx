// src/app/(protected)/brevo/page.tsx
import { Suspense } from "react";
import { BrevoMarketingContentSkeleton } from "@/components/ui/page-list-skeleton";
import { PageShell } from "@/components/ui/page-shell";
import { requireUser } from "@/lib/auth/require-user";
import { BrevoMarketingHeader } from "./BrevoMarketingHeader";
import ClientBrevoPage from "./ClientBrevoPage";

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
