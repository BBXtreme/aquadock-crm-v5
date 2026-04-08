"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import Link from "next/link";

import ReminderEditForm from "@/components/features/reminder/ReminderEditForm";
import { Button } from "@/components/ui/button";
import { getCurrentUserClient } from "@/lib/auth/get-current-user-client";
import { useT } from "@/lib/i18n/use-translations";
import type { Reminder } from "@/types/database.types";

export default function ReminderDetailClient({ reminder }: { reminder: Reminder }) {
  const t = useT("reminders");

  const { data: user } = useSuspenseQuery({
    queryKey: ["user"],
    queryFn: getCurrentUserClient,
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="sm" asChild>
          <Link href="/reminders">{t("detailBackLink")}</Link>
        </Button>
      </div>
      <ReminderEditForm reminder={reminder} user={user} />
    </div>
  );
}
