import { Suspense } from "react";
import ClientTimelinePage from "@/components/features/timeline/ClientTimelinePage";
import { TimelinePageSkeleton } from "@/components/ui/page-list-skeleton";
import { PageShell } from "@/components/ui/page-shell";
import { requireUser } from "@/lib/auth/require-user";

export default async function TimelinePage() {
  const _user = await requireUser();

  return (
    <PageShell>
      <Suspense fallback={<TimelinePageSkeleton />}>
        <ClientTimelinePage />
      </Suspense>
    </PageShell>
  );
}