import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { RemindersPageSkeleton } from "@/components/ui/page-list-skeleton";
import { resolveReminderDetail } from "@/lib/actions/resolve-detail";
import { requireUser } from "@/lib/auth/require-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import ReminderDetailClient from "./ReminderDetailClient";

export default async function ReminderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const resolved = await resolveReminderDetail(id, supabase);

  if (resolved.kind === "missing") {
    notFound();
  }

  if (resolved.kind === "trashed") {
    redirect("/reminders?trashedReminder=1");
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/30">
      <Suspense fallback={<RemindersPageSkeleton />}>
        <ReminderDetailClient reminder={resolved.reminder} />
      </Suspense>
    </div>
  );
}
