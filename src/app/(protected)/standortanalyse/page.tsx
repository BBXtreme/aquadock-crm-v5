import { StandortanalyseWizard } from "@/components/features/standortanalyse/StandortanalyseWizard";
import { PageShell } from "@/components/ui/page-shell";
import { requireUser } from "@/lib/auth/require-user";

export default async function StandortanalysePage() {
  const _user = await requireUser();

  return (
    <PageShell>
      <StandortanalyseWizard mode="internal" />
    </PageShell>
  );
}
