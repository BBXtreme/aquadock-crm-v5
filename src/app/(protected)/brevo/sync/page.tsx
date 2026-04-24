// src/app/(protected)/brevo/sync/page.tsx
import BrevoContactSyncForm from "@/components/features/brevo/BrevoContactSyncForm";
import BrevoContactSyncView from "@/components/features/brevo/BrevoContactSyncView";
import { BrevoMassSyncCard } from "@/components/features/brevo/BrevoMassSyncCard";
import { BrevoSyncPageHeader } from "@/components/features/brevo/BrevoSyncPageHeader";
import { PageShell } from "@/components/ui/page-shell";
import { requireUser } from "@/lib/auth/require-user";

export default async function BrevoSyncPage() {
  await requireUser();

  return (
    <PageShell>
      <BrevoSyncPageHeader />

      <BrevoContactSyncView />

      <BrevoMassSyncCard>
        <BrevoContactSyncForm />
      </BrevoMassSyncCard>
    </PageShell>
  );
}
