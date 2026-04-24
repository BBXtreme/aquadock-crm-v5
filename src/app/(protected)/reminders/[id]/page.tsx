import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import ReminderDetailClient from "@/components/features/reminders/ReminderDetailClient";
import { RemindersPageSkeleton } from "@/components/ui/page-list-skeleton";
import { resolveReminderDetail } from "@/lib/actions/resolve-detail";
import { requireUser } from "@/lib/auth/require-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
    <Suspense fallback={<RemindersPageSkeleton />}>
      <ReminderDetailClient reminder={resolved.reminder} />
    </Suspense>
  );
}
