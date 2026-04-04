import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth/require-user";
import ClientTimelinePage from "./ClientTimelinePage";

export default async function TimelinePage() {
  const _user = await requireUser();

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/30">
      <div className="container mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
        {/* Nice Loading Skeleton */}
        <Suspense
          fallback={
            <div className="space-y-8">
              {/* Stats Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Skeleton key="timeline-stat-1" className="h-28 rounded-2xl" />
                <Skeleton key="timeline-stat-2" className="h-28 rounded-2xl" />
                <Skeleton key="timeline-stat-3" className="h-28 rounded-2xl" />
                <Skeleton key="timeline-stat-4" className="h-28 rounded-2xl" />
              </div>

              {/* Timeline Feed - using stable predefined keys */}
              <div className="space-y-6">
                <div key="timeline-skeleton-item-1" className="flex gap-5 p-6 border border-border bg-card rounded-2xl">
                  <Skeleton className="h-11 w-11 rounded-full shrink-0" />
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-64" />
                      <Skeleton className="h-3.5 w-24" />
                    </div>
                    <Skeleton className="h-5 w-[85%]" />
                    <div className="space-y-2.5">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-6 w-28 rounded-full" />
                    </div>
                  </div>
                </div>

                <div key="timeline-skeleton-item-2" className="flex gap-5 p-6 border border-border bg-card rounded-2xl">
                  <Skeleton className="h-11 w-11 rounded-full shrink-0" />
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-64" />
                      <Skeleton className="h-3.5 w-24" />
                    </div>
                    <Skeleton className="h-5 w-[85%]" />
                    <div className="space-y-2.5">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-6 w-28 rounded-full" />
                    </div>
                  </div>
                </div>

                <div key="timeline-skeleton-item-3" className="flex gap-5 p-6 border border-border bg-card rounded-2xl">
                  <Skeleton className="h-11 w-11 rounded-full shrink-0" />
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-64" />
                      <Skeleton className="h-3.5 w-24" />
                    </div>
                    <Skeleton className="h-5 w-[85%]" />
                    <div className="space-y-2.5">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-6 w-28 rounded-full" />
                    </div>
                  </div>
                </div>

                <div key="timeline-skeleton-item-4" className="flex gap-5 p-6 border border-border bg-card rounded-2xl">
                  <Skeleton className="h-11 w-11 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-64" />
                      <Skeleton className="h-3.5 w-24" />
                    </div>
                    <Skeleton className="h-5 w-[85%]" />
                    <div className="space-y-2.5">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-6 w-28 rounded-full" />
                    </div>
                  </div>
                </div>

                <div key="timeline-skeleton-item-5" className="flex gap-5 p-6 border border-border bg-card rounded-2xl">
                  <Skeleton className="h-11 w-11 rounded-full shrink-0" />
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-64" />
                      <Skeleton className="h-3.5 w-24" />
                    </div>
                    <Skeleton className="h-5 w-[85%]" />
                    <div className="space-y-2.5">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-6 w-28 rounded-full" />
                    </div>
                  </div>
                </div>

                <div key="timeline-skeleton-item-6" className="flex gap-5 p-6 border border-border bg-card rounded-2xl">
                  <Skeleton className="h-11 w-11 rounded-full shrink-0" />
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-64" />
                      <Skeleton className="h-3.5 w-24" />
                    </div>
                    <Skeleton className="h-5 w-[85%]" />
                    <div className="space-y-2.5">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-6 w-28 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
        >
          <ClientTimelinePage />
        </Suspense>
      </div>
    </div>
  );
}