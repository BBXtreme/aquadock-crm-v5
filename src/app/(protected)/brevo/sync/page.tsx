// src/app/(protected)/brevo/sync/page.tsx
import BrevoContactSyncForm from "@/components/features/brevo/BrevoContactSyncForm";
import BrevoContactSyncView from "@/components/features/brevo/BrevoContactSyncView";
import { PageShell } from "@/components/ui/page-shell";
import { requireUser } from "@/lib/auth/require-user";
import { BrevoMassSyncCard } from "../BrevoMassSyncCard";
import { BrevoSyncPageHeader } from "../BrevoSyncPageHeader";

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
