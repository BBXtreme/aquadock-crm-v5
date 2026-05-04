"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import Link from "next/link";

import ReminderEditForm from "@/components/features/reminders/ReminderEditForm";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { PageShell } from "@/components/ui/page-shell";
import { getCurrentUserClient } from "@/lib/auth/get-current-user-client";
import { useNumberLocaleTag, useT } from "@/lib/i18n/use-translations";
import type { Reminder } from "@/types/database.types";

export default function ReminderDetailClient({ reminder }: { reminder: Reminder }) {
  const t = useT("reminders");
  const localeTag = useNumberLocaleTag();

  const { data: user } = useSuspenseQuery({
    queryKey: ["user"],
    queryFn: getCurrentUserClient,
  });

  const dueDate = reminder.due_date ? new Date(reminder.due_date).toLocaleDateString(localeTag) : null;

  return (
    <PageShell className="max-w-3xl">
      <header className="flex flex-col gap-4 border-b border-border/40 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/reminders">{t("title")}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="max-w-[40ch] truncate">{reminder.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{reminder.title}</h1>
            {dueDate && (
              <p className="mt-1 text-muted-foreground">
                {t("due")}
                {": "}
                {dueDate}
              </p>
            )}
          </div>
        </div>
      </header>

      <ReminderEditForm reminder={reminder} user={user} />
    </PageShell>
  );
}
