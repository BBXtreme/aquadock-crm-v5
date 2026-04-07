import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Matches StatCard / list rows: soft card, light ring, slight gradient. */
export const pageSkeletonPanel = cn(
  "rounded-2xl border border-border/60 bg-gradient-to-br from-card/95 to-card/75 shadow-sm ring-1 ring-foreground/[0.05]",
);

export function PageListHeaderSkeleton({ actionWidthClassName = "w-44" }: { actionWidthClassName?: string }) {
  return (
    <div className="flex flex-col gap-4 border-b border-border/80 pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-3">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-9 w-52 max-w-full" />
        <Skeleton className="h-4 w-44 max-w-full" />
      </div>
      <Skeleton className={cn("h-10 shrink-0 rounded-md", actionWidthClassName)} />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className={cn("flex flex-col gap-3 p-5", pageSkeletonPanel)}>
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
      </div>
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-3 w-36" />
    </div>
  );
}

export function StatCardsRowSkeleton({
  count,
  gridClassName,
}: {
  count: number;
  gridClassName: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-4", gridClassName)}>
      {Array.from({ length: count }, (_, i) => (
        <StatCardSkeleton key={`page-skel-stat-${i}`} />
      ))}
    </div>
  );
}

function CompanyListRowSkeleton() {
  return (
    <div className={cn("flex items-center gap-4 p-5", pageSkeletonPanel)}>
      <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-5 w-64 max-w-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
    </div>
  );
}

function ContactListRowSkeleton() {
  return (
    <div className={cn("flex items-center gap-4 p-5", pageSkeletonPanel)}>
      <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-5 w-56 max-w-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <Skeleton className="h-4 w-52" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-44" />
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
    </div>
  );
}

function TimelineFeedRowSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div className={cn("flex gap-4 p-5 sm:gap-5 sm:p-6", pageSkeletonPanel)}>
      <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Skeleton className="h-4 w-56 max-w-full" />
          <Skeleton className="h-3.5 w-24 shrink-0" />
        </div>
        <Skeleton className="h-5 w-[88%] max-w-xl" />
        <div className={cn("space-y-2.5", compact && "space-y-2")}>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <div className="flex flex-wrap gap-2 pt-0.5">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function CompaniesPageSkeleton({ rowCount = 7 }: { rowCount?: number }) {
  return (
    <div className="space-y-8">
      <PageListHeaderSkeleton />
      <StatCardsRowSkeleton count={4} gridClassName="md:grid-cols-2 lg:grid-cols-4" />
      <Card className="overflow-hidden border-border/60 shadow-sm ring-1 ring-foreground/[0.05]">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-full" />
          </div>
          <Skeleton className="h-10 w-full max-w-lg rounded-md" />
          <div className="space-y-3">
            {Array.from({ length: rowCount }, (_, i) => (
              <CompanyListRowSkeleton key={`companies-skel-row-${i}`} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ContactsPageSkeleton({ rowCount = 7 }: { rowCount?: number }) {
  return (
    <div className="space-y-8">
      <PageListHeaderSkeleton />
      <StatCardsRowSkeleton count={3} gridClassName="md:grid-cols-3" />
      <Card className="overflow-hidden border-border/60 shadow-sm ring-1 ring-foreground/[0.05]">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Skeleton className="h-10 w-full flex-1 rounded-md" />
            <Skeleton className="h-10 w-full shrink-0 rounded-md sm:w-32" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: rowCount }, (_, i) => (
              <ContactListRowSkeleton key={`contacts-skel-row-${i}`} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function TimelinePageSkeleton({ rowCount = 6 }: { rowCount?: number }) {
  return (
    <div className="space-y-8">
      <PageListHeaderSkeleton actionWidthClassName="w-52 sm:w-56" />
      <Card className="overflow-hidden border-border/60 shadow-sm ring-1 ring-foreground/[0.05]">
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-col gap-3 border-b border-border/50 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-9 w-full max-w-md rounded-md" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24 rounded-md" />
              <Skeleton className="h-9 w-24 rounded-md" />
            </div>
          </div>
          <div className="hidden grid-cols-12 gap-3 border-b border-border/40 pb-2 md:grid">
            <Skeleton className="col-span-2 h-3" />
            <Skeleton className="col-span-2 h-3" />
            <Skeleton className="col-span-3 h-3" />
            <Skeleton className="col-span-2 h-3" />
            <Skeleton className="col-span-2 h-3" />
            <Skeleton className="col-span-1 h-3 justify-self-end" />
          </div>
          <div className="space-y-3 md:hidden">
            {Array.from({ length: rowCount }, (_, i) => (
              <TimelineFeedRowSkeleton key={`timeline-skel-feed-${i}`} compact />
            ))}
          </div>
          <div className="hidden space-y-2 md:block">
            {Array.from({ length: rowCount + 2 }, (_, i) => (
              <div
                key={`timeline-skel-table-${i}`}
                className="grid grid-cols-12 items-center gap-3 rounded-xl border border-border/50 bg-card/40 px-3 py-3 ring-1 ring-foreground/[0.03]"
              >
                <Skeleton className="col-span-2 h-4" />
                <Skeleton className="col-span-2 h-6 w-full rounded-full" />
                <Skeleton className="col-span-3 h-4" />
                <Skeleton className="col-span-2 h-4" />
                <Skeleton className="col-span-2 h-4" />
                <div className="col-span-1 flex justify-end gap-1">
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
