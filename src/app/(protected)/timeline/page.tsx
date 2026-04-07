import { Suspense } from "react";
import { TimelinePageSkeleton } from "@/components/ui/page-list-skeleton";
import { requireUser } from "@/lib/auth/require-user";
import ClientTimelinePage from "./ClientTimelinePage";

export default async function TimelinePage() {
  const _user = await requireUser();

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/30">
      <div className="container mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
        <Suspense fallback={<TimelinePageSkeleton />}>
          <ClientTimelinePage />
        </Suspense>
      </div>
    </div>
  );
}