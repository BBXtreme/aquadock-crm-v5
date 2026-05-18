import { StandortanalyseWizard } from "@/components/features/standortanalyse/StandortanalyseWizard";

export default async function PublicStandortanalysePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/20 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <StandortanalyseWizard mode="public" shareToken={token} />
      </div>
    </div>
  );
}
