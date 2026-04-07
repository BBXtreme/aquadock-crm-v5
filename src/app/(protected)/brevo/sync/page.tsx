// src/app/(protected)/brevo/sync/page.tsx
import BrevoContactSyncForm from "@/components/features/brevo/BrevoContactSyncForm";
import BrevoContactSyncView from "@/components/features/brevo/BrevoContactSyncView";
import { requireUser } from "@/lib/auth/require-user";
import { BrevoMassSyncCard } from "../BrevoMassSyncCard";
import { BrevoSyncPageHeader } from "../BrevoSyncPageHeader";

export default async function BrevoSyncPage() {
  await requireUser();

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/30">
      <div className="container mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
        <BrevoSyncPageHeader />

        <BrevoContactSyncView />

        <BrevoMassSyncCard>
          <BrevoContactSyncForm />
        </BrevoMassSyncCard>
      </div>
    </div>
  );
}
