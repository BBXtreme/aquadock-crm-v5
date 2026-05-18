import { StandortanalyseWizard } from "@/components/features/standortanalyse/StandortanalyseWizard";
import { PageShell } from "@/components/ui/page-shell";
import { requireUser } from "@/lib/auth/require-user";

export default async function StandortanalysePage({
  searchParams,
}: {
  searchParams: Promise<{ analysisId?: string }>;
}) {
  const _user = await requireUser();
  const { analysisId } = await searchParams;
  const initialAnalysisId =
    analysisId != null && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(analysisId)
      ? analysisId
      : undefined;

  return (
    <PageShell>
      <StandortanalyseWizard mode="internal" initialAnalysisId={initialAnalysisId} />
    </PageShell>
  );
}
