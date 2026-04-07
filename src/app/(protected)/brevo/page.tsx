// src/app/(protected)/brevo/page.tsx
import { Suspense } from "react";
import { BrevoMarketingContentSkeleton } from "@/components/ui/page-list-skeleton";
import { requireUser } from "@/lib/auth/require-user";
import { BrevoMarketingHeader } from "./BrevoMarketingHeader";
import ClientBrevoPage from "./ClientBrevoPage";

export default async function BrevoPage() {
  await requireUser();

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/30">
      <div className="container mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
        <BrevoMarketingHeader />

        <Suspense fallback={<BrevoMarketingContentSkeleton />}>
          <ClientBrevoPage />
        </Suspense>
      </div>
    </div>
  );
}
