import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { TimelinePageSkeleton } from "@/components/ui/page-list-skeleton";
import { resolveTimelineDetail } from "@/lib/actions/resolve-detail";
import { requireUser } from "@/lib/auth/require-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import TimelineDetailClient from "./TimelineDetailClient";

export default async function TimelineEntryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const resolved = await resolveTimelineDetail(id, supabase);

  if (resolved.kind === "missing") {
    notFound();
  }

  if (resolved.kind === "trashed") {
    redirect("/timeline?trashedTimeline=1");
  }

  return (
    <Suspense fallback={<TimelinePageSkeleton />}>
      <TimelineDetailClient entryId={id} initialEntry={resolved.entry} />
    </Suspense>
  );
}
