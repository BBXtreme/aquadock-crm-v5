// src/components/ui/page-list-skeleton.tsx
// This file contains the skeleton components for the page list.
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Vertical rhythm for list-style protected pages */
export const skeletonPageStack = "space-y-8";

const STAT_SLOT_KEYS = ["stat-a", "stat-b", "stat-c", "stat-d"] as const;
const ROW_KEYS = ["r0", "r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8", "r9", "r10", "r11"] as const;
const FILTER_CHIP_KEYS = ["fc0", "fc1", "fc2", "fc3", "fc4", "fc5", "fc6", "fc7"] as const;

/**
 * Skeleton card chrome — NO borders, NO rings, NO lines.
 * Only soft background with subtle fade transition.
 */
export const skeletonCardChrome = cn(
  "bg-card/92 text-card-foreground shadow-none dark:bg-card/88 transition-all duration-300 ease-out",
);

/** Chart / wide panels — no borders, with fade */
export const skeletonPanelChrome = cn(
  "rounded-2xl bg-card/92 p-6 shadow-none dark:bg-card/85 transition-all duration-300 ease-out",
);

/** Dense row shell — completely borderless with fade */
export const skeletonDenseRowShell = cn(
  "flex gap-4 rounded-lg bg-card/45 p-4 dark:bg-card/25 transition-all duration-300 ease-out",
);

const skeletonHeaderRule = "border-b border-transparent"; // invisible

export const skeletonUltraLightDivider = "border-b border-transparent";

/** Page root with subtle fade-in */
function PageSkeletonRoot({
  children,
  label,
  className,
}: {
  children: ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(skeletonPageStack, "animate-in fade-in duration-500", className)}
      aria-busy="true"
      aria-live="polite"
      aria-label={label}
    >
      {children}
    </div>
  );
}

export function SkeletonPageHeader({
  actionClassName = "w-36",
  breadcrumbWidth = "w-40",
  titleWidth = "w-52",
  subtitleWidth = "w-36",
}: {
  actionClassName?: string;
  breadcrumbWidth?: string;
  titleWidth?: string;
  subtitleWidth?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 pb-6 sm:flex-row sm:items-center sm:justify-between",
        skeletonHeaderRule,
      )}
    >
      <div className="space-y-3">
        <Skeleton className={cn("h-3", breadcrumbWidth)} />
        <Skeleton className={cn("h-9 max-w-full", titleWidth)} />
        <Skeleton className={cn("h-4", subtitleWidth)} />
      </div>
      <Skeleton className={cn("h-10 shrink-0 rounded-md", actionClassName)} />
    </div>
  );
}

export function SkeletonStatStrip({
  count,
  gridClassName,
  className,
}: {
  count: number;
  gridClassName: string;
  className?: string;
}) {
  const keys = STAT_SLOT_KEYS.slice(0, count);
  return (
    <div className={cn("grid grid-cols-1 gap-4 pb-6", gridClassName, className)}>
      {keys.map((key) => (
        <Skeleton
          key={key}
          className="h-28 rounded-2xl bg-card/90 dark:bg-card/80 transition-all duration-300 ease-out"
        />
      ))}
    </div>
  );
}

export function SkeletonFilterStrip({
  chips,
  className,
}: {
  chips: { width: string }[];
  className?: string;
}) {
  const keys = FILTER_CHIP_KEYS.slice(0, chips.length);
  return (
    <div className={cn("flex flex-wrap items-center gap-2 pb-4", className)}>
      {chips.map((chip, i) => (
        <Skeleton
          key={keys[i]}
          className={cn("h-8 rounded-md transition-all duration-300 ease-out", chip.width)}
        />
      ))}
    </div>
  );
}

export function SkeletonListCard({
  titleWidth = "w-48",
  children,
}: {
  titleWidth?: string;
  children: ReactNode;
}) {
  return (
    <Card className={skeletonCardChrome}>
      <CardHeader>
        <Skeleton className={cn("h-5", titleWidth)} />
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function ReminderDenseRowSkeleton() {
  return (
    <div className={skeletonDenseRowShell}>
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-5 w-48 max-w-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-3 w-44" />
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-md" />
      </div>
    </div>
  );
}

function CompanyDenseRowSkeleton() {
  return (
    <div className={cn("flex items-center", skeletonDenseRowShell)}>
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
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-md" />
      </div>
    </div>
  );
}

function ContactDenseRowSkeleton() {
  return (
    <div className={cn("flex items-center", skeletonDenseRowShell)}>
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
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-md" />
      </div>
    </div>
  );
}

function TimelineFeedDenseRowSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div className={skeletonDenseRowShell}>
      <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Skeleton className="h-4 w-56 max-w-full" />
          <Skeleton className="h-3.5 w-24 shrink-0" />
        </div>
        <Skeleton className="h-5 max-w-xl w-[88%]" />
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

const DEFAULT_REMINDER_ROWS = ["rm-1", "rm-2", "rm-3", "rm-4", "rm-5"] as const;

export function RemindersPageSkeleton(
  props: { rowKeys?: readonly string[] } = {},
) {
  const rowKeys = props.rowKeys ?? DEFAULT_REMINDER_ROWS;
  return (
    <PageSkeletonRoot label="Erinnerungen werden geladen">
      <SkeletonPageHeader />
      <SkeletonStatStrip count={4} gridClassName="md:grid-cols-4" />
      <SkeletonFilterStrip
        chips={[{ width: "w-14" }, { width: "w-16" }, { width: "w-20" }, { width: "w-20" }, { width: "w-24" }]}
      />
      <SkeletonListCard>
        {rowKeys.map((key) => (
          <ReminderDenseRowSkeleton key={key} />
        ))}
      </SkeletonListCard>
    </PageSkeletonRoot>
  );
}

export function CompaniesPageSkeleton({ rowCount = 7 }: { rowCount?: number }) {
  const keys = ROW_KEYS.slice(0, rowCount);
  return (
    <PageSkeletonRoot label="Firmen werden geladen">
      <SkeletonPageHeader actionClassName="w-44" />
      <SkeletonStatStrip count={4} gridClassName="md:grid-cols-2 lg:grid-cols-4" />
      <SkeletonListCard titleWidth="w-56">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-7 w-20 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-16 rounded-full" />
        </div>
        <Skeleton className="h-10 w-full max-w-lg rounded-md" />
        <div className="space-y-3">
          {keys.map((key) => (
            <CompanyDenseRowSkeleton key={key} />
          ))}
        </div>
      </SkeletonListCard>
    </PageSkeletonRoot>
  );
}

export function ContactsPageSkeleton({ rowCount = 7 }: { rowCount?: number }) {
  const keys = ROW_KEYS.slice(0, rowCount);
  return (
    <PageSkeletonRoot label="Kontakte werden geladen">
      <SkeletonPageHeader />
      <SkeletonStatStrip count={3} gridClassName="md:grid-cols-3" />
      <SkeletonListCard titleWidth="w-52">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Skeleton className="h-10 w-full flex-1 rounded-md" />
          <Skeleton className="h-10 w-full shrink-0 rounded-md sm:w-32" />
        </div>
        <div className="space-y-3">
          {keys.map((key) => (
            <ContactDenseRowSkeleton key={key} />
          ))}
        </div>
      </SkeletonListCard>
    </PageSkeletonRoot>
  );
}

const timelineTableRowKeys = ROW_KEYS;

export function TimelinePageSkeleton({ rowCount = 6 }: { rowCount?: number }) {
  const feedKeys = ROW_KEYS.slice(0, rowCount);
  const tableKeys = timelineTableRowKeys.slice(0, rowCount + 2);
  return (
    <PageSkeletonRoot label="Timeline wird geladen">
      <SkeletonPageHeader actionClassName="w-52 sm:w-56" breadcrumbWidth="w-36" titleWidth="w-44" />
      <Card className={skeletonCardChrome}>
        <CardContent className="space-y-4 p-6">
          <div
            className={cn(
              "flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between",
              skeletonHeaderRule,
            )}
          >
            <Skeleton className="h-9 w-full max-w-md rounded-md" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24 rounded-md" />
              <Skeleton className="h-9 w-24 rounded-md" />
            </div>
          </div>
          <div className="hidden grid-cols-12 gap-3 pb-2 md:grid">
            <Skeleton className="col-span-2 h-3" />
            <Skeleton className="col-span-2 h-3" />
            <Skeleton className="col-span-3 h-3" />
            <Skeleton className="col-span-2 h-3" />
            <Skeleton className="col-span-2 h-3" />
            <Skeleton className="col-span-1 h-3 justify-self-end" />
          </div>
          <div className="space-y-3 md:hidden">
            {feedKeys.map((key) => (
              <TimelineFeedDenseRowSkeleton key={key} compact />
            ))}
          </div>
          <div className="hidden space-y-2 md:block">
            {tableKeys.map((key) => (
              <div key={key} className={cn("grid grid-cols-12 items-center gap-3", skeletonDenseRowShell, "py-3")}>
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
    </PageSkeletonRoot>
  );
}

const MASS_EMAIL_RECIPIENT_ROW_KEYS = ["me-r0", "me-r1", "me-r2", "me-r3", "me-r4", "me-r5"] as const;
const BREVO_FORM_FIELD_KEYS = ["bf-0", "bf-1", "bf-2", "bf-3", "bf-4", "bf-5"] as const;
const BREVO_LIST_ROW_KEYS = ["bc-0", "bc-1", "bc-2", "bc-3", "bc-4", "bc-5"] as const;

/** Mass email skeleton */
export function MassEmailPageSkeleton() {
  return (
    <PageSkeletonRoot label="Massen-E-Mail wird geladen">
      <div
        className={cn(
          "flex flex-col gap-4 pb-6 sm:flex-row sm:items-center sm:justify-between",
          skeletonHeaderRule,
        )}
      >
        <div className="space-y-2">
          <Skeleton className="h-9 w-56 max-w-full" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Skeleton className="h-8 w-36 rounded-full" />
          <Skeleton className="h-9 w-40 rounded-md" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card className={skeletonCardChrome}>
          <CardHeader className="space-y-3">
            <Skeleton className="h-5 w-44" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-28 rounded-md" />
              <Skeleton className="h-9 w-32 rounded-md" />
            </div>
            <Skeleton className="h-10 w-full rounded-md" />
          </CardHeader>
          <CardContent className="space-y-3">
            {MASS_EMAIL_RECIPIENT_ROW_KEYS.map((key) => (
              <div key={key} className={cn("items-center", skeletonDenseRowShell)}>
                <Skeleton className="h-4 w-4 shrink-0 rounded-sm" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-48 max-w-full" />
                  <Skeleton className="h-3 w-40 max-w-full" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className={skeletonCardChrome}>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-36 w-full rounded-md" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={skeletonCardChrome}>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-5 w-36" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-28 rounded-md" />
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 rounded-lg bg-muted/12 p-4 dark:bg-muted/18">
            <Skeleton className="h-4 w-3/4 max-w-xl" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </CardContent>
      </Card>
    </PageSkeletonRoot>
  );
}

/** Brevo main area — no lines, with fade */
export function BrevoMarketingContentSkeleton() {
  return (
    <div
      role="status"
      className="space-y-10 lg:space-y-12"
      aria-busy="true"
      aria-live="polite"
      aria-label="Brevo-Inhalt wird geladen"
    >
      <section className="space-y-8">
        <div className={cn("space-y-3 pb-6", skeletonHeaderRule)}>
          <Skeleton className="h-8 w-72 max-w-full" />
          <Skeleton className="h-4 w-full max-w-3xl" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>

        <Card className={skeletonCardChrome}>
          <CardContent className="space-y-6 p-6">
            {BREVO_FORM_FIELD_KEYS.map((key) => (
              <div key={key} className="space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            ))}
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-28 w-full rounded-md" />
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Skeleton className="h-10 w-40 rounded-md" />
              <Skeleton className="h-10 w-44 rounded-md" />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-6">
        <div className={cn("space-y-2 pb-6", skeletonHeaderRule)}>
          <Skeleton className="h-7 w-56 max-w-full" />
          <Skeleton className="h-4 w-full max-w-lg" />
        </div>

        <div className="space-y-2 rounded-xl bg-card/45 p-4 dark:bg-card/38">
          <div className="grid grid-cols-4 gap-3 pb-3">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>

          {BREVO_LIST_ROW_KEYS.map((key) => (
            <div
              key={key}
              className="grid grid-cols-4 items-center gap-3 py-2.5 last:pb-0"
            >
              <Skeleton className="h-4 w-full max-w-40" />
              <Skeleton className="h-4 w-full max-w-48" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-4 w-24 justify-self-end" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const SETTINGS_SMTP_ROW_KEYS = ["ss0", "ss1", "ss2", "ss3", "ss4", "ss5"] as const;

/** Settings grid */
export function SettingsPageSkeleton() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Einstellungen werden geladen"
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className={skeletonCardChrome}>
          <CardHeader className="space-y-2">
            <Skeleton className="h-6 w-52 max-w-full" />
            <Skeleton className="h-4 w-full max-w-md" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-full max-w-xs" />
              </div>
              <Skeleton className="h-6 w-11 shrink-0 rounded-full" />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-full max-w-sm" />
              </div>
              <Skeleton className="h-6 w-11 shrink-0 rounded-full" />
            </div>
          </CardContent>
        </Card>

        <Card className={skeletonCardChrome}>
          <CardHeader>
            <Skeleton className="h-6 w-36" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <Skeleton className="h-4 w-56" />
          </CardContent>
        </Card>

        <Card className={cn(skeletonCardChrome, "md:col-span-2")}>
          <CardHeader>
            <Skeleton className="h-6 w-44" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-24 w-full rounded-md" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-11 rounded-full" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-40 w-full rounded-md" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-10 w-44 rounded-md" />
              <Skeleton className="h-10 w-40 rounded-md" />
              <Skeleton className="h-10 w-36 rounded-md" />
            </div>
          </CardContent>
        </Card>

        <Card className={cn(skeletonCardChrome, "md:col-span-2")}>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full max-w-2xl" />
            <Skeleton className="h-4 w-full max-w-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full max-w-md rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full max-w-md rounded-md" />
            </div>
            <Skeleton className="h-10 w-56 rounded-md" />
            <Skeleton className="h-4 w-full max-w-lg" />
          </CardContent>
        </Card>

        <div className="md:col-span-2">
          <Card className={skeletonCardChrome}>
            <CardHeader>
              <Skeleton className="h-6 w-36" />
            </CardHeader>
            <CardContent className="space-y-5">
              {SETTINGS_SMTP_ROW_KEYS.map((key) => (
                <div key={key} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <Skeleton className="h-4 w-32 shrink-0 sm:pt-2" />
                  <Skeleton className="h-10 flex-1 rounded-md" />
                </div>
              ))}
              <div className="flex flex-wrap gap-2 pt-2">
                <Skeleton className="h-10 w-32 rounded-md" />
                <Skeleton className="h-10 w-36 rounded-md" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/** Full profile route shell */
export function ProfilePageSkeleton() {
  return (
    <div
      className="container mx-auto max-w-6xl space-y-10 p-6 lg:p-10"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Profil wird geladen"
    >
      <div className="space-y-2">
        <Skeleton className="h-9 w-36 max-w-full" />
        <Skeleton className="h-6 w-64 max-w-full" />
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <Card className={skeletonCardChrome}>
          <CardHeader className="pb-6">
            <Skeleton className="h-7 w-52 max-w-full" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Skeleton className="h-32 w-32 rounded-full" />
                <Skeleton className="absolute right-0 bottom-0 h-10 w-10 rounded-full shadow-none ring-1 ring-foreground/2 dark:ring-foreground/4" />
              </div>
              <div className="flex w-full flex-col items-center space-y-2">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-56 max-w-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <div className="w-full space-y-3 pt-2">
                <div
                  className="mx-auto h-px max-w-xs bg-linear-to-r from-transparent via-foreground/6 to-transparent dark:via-foreground/10"
                  aria-hidden
                />
                <div className="space-y-2">
                  <Skeleton className="mx-auto h-3 w-52" />
                  <Skeleton className="mx-auto h-3 w-56" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={skeletonCardChrome}>
          <CardHeader className="pb-6">
            <Skeleton className="h-7 w-40" />
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-5">
              <Skeleton className="h-4 w-44" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="space-y-5 border-border/50 border-t pt-8">
              <Skeleton className="h-5 w-32" />
              <div className="flex flex-wrap gap-2 border-border/40 border-b pb-2">
                <Skeleton className="h-8 w-28 rounded-md" />
                <Skeleton className="h-8 w-28 rounded-md" />
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={skeletonCardChrome}>
        <CardHeader className="pb-6">
          <Skeleton className="h-7 w-44" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-11 w-40 rounded-md" />
        </CardContent>
      </Card>
    </div>
  );
}

const DASHBOARD_FUNNEL_ROWS = [
  { key: "df-0", bar: "max-w-[90%] w-full" },
  { key: "df-1", bar: "max-w-[75%] w-full" },
  { key: "df-2", bar: "max-w-[62%] w-full" },
  { key: "df-3", bar: "max-w-[48%] w-full" },
  { key: "df-4", bar: "max-w-[36%] w-full" },
] as const;

/** Dashboard KPI strip + chart cards */
export function DashboardContentSkeleton() {
  return (
    <div
      className="space-y-8"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Dashboard wird geladen"
    >
      <SkeletonStatStrip count={4} gridClassName="md:grid-cols-2 lg:grid-cols-4" className="pb-0" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={skeletonPanelChrome}>
          <div className="mb-6 flex items-center justify-between gap-4">
            <Skeleton className="h-6 w-44 max-w-[55%]" />
            <Skeleton className="h-3 w-32 shrink-0" />
          </div>
          <div className="flex min-h-[300px] h-[320px] flex-col justify-center gap-4">
            {DASHBOARD_FUNNEL_ROWS.map((row) => (
              <div key={row.key} className="flex items-center gap-3">
                <Skeleton className="h-4 w-24 shrink-0" />
                <Skeleton className={cn("h-8 rounded-lg", row.bar)} />
              </div>
            ))}
          </div>
        </div>

        <div className={skeletonPanelChrome}>
          <div className="mb-6 flex items-center justify-between">
            <Skeleton className="h-6 w-48 max-w-[70%]" />
          </div>
          <div className="flex min-h-[300px] h-[320px] flex-col items-center justify-center gap-6">
            <Skeleton className="h-52 w-52 shrink-0 rounded-full" />
            <div className="flex w-full max-w-xs flex-wrap justify-center gap-3">
              <Skeleton className="h-3 w-20 rounded-full" />
              <Skeleton className="h-3 w-24 rounded-full" />
              <Skeleton className="h-3 w-16 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Skeleton className="h-10 w-44 rounded-xl" />
      </div>
    </div>
  );
}

const OPENMAP_CONTROL_KEYS = ["omc-0", "omc-1", "omc-2"] as const;

/** OpenMap skeleton — no borders, with fade */
export function OpenMapViewSkeleton() {
  return (
    <div
      className="relative h-[calc(100vh-4rem)] w-full overflow-hidden bg-muted/18 dark:bg-muted/22 transition-all duration-500 ease-out"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label="Karte wird geladen"
    >
      <div
        className="absolute inset-0 bg-linear-to-br from-muted/50 via-background/30 to-muted/40"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklch,var(--border)_8%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--border)_8%,transparent)_1px,transparent_1px)] bg-size-[44px_44px] opacity-[0.38] dark:opacity-[0.26]"
        aria-hidden
      />

      <div className="absolute top-4 left-4 z-1000 rounded-md bg-card/88 px-3 py-2 shadow-none backdrop-blur-sm dark:bg-card/85 transition-all duration-300 ease-out">
        <Skeleton className="h-4 w-36" />
      </div>

      <div className="absolute top-4 right-4 z-1000 flex flex-col gap-2">
        {OPENMAP_CONTROL_KEYS.map((key) => (
          <Skeleton
            key={key}
            className="h-9 w-9 shrink-0 rounded-md shadow-none ring-1 ring-inset ring-foreground/1.5 dark:ring-foreground/3"
          />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
          <div className="w-full space-y-2">
            <Skeleton className="mx-auto h-4 w-48" />
            <Skeleton className="mx-auto h-3 w-64 max-w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}