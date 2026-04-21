"use client";

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCurrentUserClient } from "@/lib/auth/get-current-user-client";
import { useNumberLocaleTag, useT } from "@/lib/i18n/use-translations";
import { listNotificationsForUser, markAllRead, markAsRead } from "@/lib/services/in-app-notifications";
import { createClient } from "@/lib/supabase/browser";
import { safeDisplay } from "@/lib/utils/data-format";
import { parseInAppNotificationPayload } from "@/lib/validations/notification";
import type { UserNotification } from "@/types/database.types";

function formatDateTimeLocale(iso: string | null | undefined, localeTag: string): string {
  if (iso == null || iso === "") {
    return "—";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "—";
  }
  return d.toLocaleString(localeTag, { dateStyle: "medium", timeStyle: "short" });
}

function getInAppNotificationHref(n: UserNotification): string {
  const payload = parseInAppNotificationPayload(n.type, n.payload);
  if (payload == null) {
    return "/dashboard";
  }
  if ("reminderId" in payload) {
    return `/companies/${payload.companyId}`;
  }
  if ("timelineId" in payload) {
    return `/companies/${payload.companyId}`;
  }
  if ("commentId" in payload) {
    return `/companies/${payload.companyId}`;
  }
  return "/dashboard";
}

function InAppNotificationsTable({ userId }: { userId: string }) {
  const t = useT("inAppNotifications");
  const localeTag = useNumberLocaleTag();
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);

  const { data: rows = [] } = useSuspenseQuery({
    queryKey: ["in-app-notifications", userId],
    queryFn: () => listNotificationsForUser(supabase, userId, { limit: 200 }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllRead(supabase, userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["in-app-notifications", userId] });
      await queryClient.invalidateQueries({ queryKey: ["in-app-notifications-unread", userId] });
      toast.success(t("allMarkedToast"));
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : t("loadError");
      toast.error(t("loadError"), { description: msg });
    },
  });

  const markOneMutation = useMutation({
    mutationFn: (id: string) => markAsRead(supabase, userId, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["in-app-notifications", userId] });
      await queryClient.invalidateQueries({ queryKey: ["in-app-notifications-unread", userId] });
    },
  });

  const columns = useMemo(
    () =>
      [
        {
          id: "created_at",
          header: t("colDate"),
          cell: ({ row }) => formatDateTimeLocale(row.original.created_at, localeTag),
        },
        {
          id: "title",
          header: t("colTitle"),
          cell: ({ row }) => {
            const n = row.original;
            return (
              <div className="max-w-md">
                <div className="font-medium text-foreground">{safeDisplay(n.title, "—")}</div>
                {n.body != null && n.body.trim() !== "" && (
                  <p className="text-muted-foreground line-clamp-2 text-sm">{n.body}</p>
                )}
              </div>
            );
          },
        },
        {
          id: "type",
          header: t("colType"),
          cell: ({ row }) => {
            const kind = row.original.type;
            switch (kind) {
              case "reminder_assigned":
                return t("types.reminder_assigned");
              case "timeline_on_company":
                return t("types.timeline_on_company");
              case "comment_reply":
                return t("types.comment_reply");
              default:
                return t("typeUnknown");
            }
          },
        },
        {
          id: "actions",
          header: t("colActions"),
          cell: ({ row }) => {
            const n = row.original;
            const href = getInAppNotificationHref(n);
            return (
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link
                    href={href}
                    aria-label={t("openLinkAria")}
                    onClick={() => {
                      if (n.read_at == null) {
                        markOneMutation.mutate(n.id);
                      }
                    }}
                  >
                    <ExternalLink className="mr-1 h-3.5 w-3.5" aria-hidden />
                    {t("openLink")}
                  </Link>
                </Button>
                {n.read_at == null && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      markOneMutation.mutate(n.id);
                    }}
                    disabled={markOneMutation.isPending}
                  >
                    {t("markRead")}
                  </Button>
                )}
              </div>
            );
          },
        },
      ] satisfies ColumnDef<UserNotification, unknown>[],
    [t, localeTag, markOneMutation],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("pageTitle")}</h1>
          <p className="text-muted-foreground text-sm">{t("pageDescription")}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            markAllMutation.mutate();
          }}
          disabled={markAllMutation.isPending || rows.length === 0}
        >
          {markAllMutation.isPending ? t("markAllReadPending") : t("markAllRead")}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {rows.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id}>
                      {hg.headers.map((h) => (
                        <TableHead key={h.id}>
                          {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => {
                    const isUnread = row.original.read_at == null;
                    return (
                      <TableRow
                        key={row.id}
                        className={isUnread ? "bg-muted/40" : undefined}
                        data-state={row.getIsSelected() ? "selected" : undefined}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ClientNotificationsPage() {
  const t = useT("inAppNotifications");
  const { data: user } = useSuspenseQuery({
    queryKey: ["user"],
    queryFn: getCurrentUserClient,
  });

  if (user == null) {
    return (
      <div className="text-muted-foreground p-6">
        <p>{t("notSignedIn")}</p>
      </div>
    );
  }

  return <InAppNotificationsTable userId={user.id} />;
}
