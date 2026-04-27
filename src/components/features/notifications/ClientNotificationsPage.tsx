"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCurrentUserClient } from "@/lib/auth/get-current-user-client";
import { ADMIN_IN_APP_MIRROR_TITLE_PREFIX } from "@/lib/constants/notifications";
import { useNumberLocaleTag, useT } from "@/lib/i18n/use-translations";
import { useInAppNotificationsRealtime } from "@/lib/realtime/in-app-notifications-realtime";
import {
  IN_APP_NOTIFICATIONS_PAGE_SIZE,
  listNotificationsForUserPage,
  markAllRead,
  markAsRead,
} from "@/lib/services/in-app-notifications";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { safeDisplay } from "@/lib/utils/data-format";
import { parseInAppNotificationPayload } from "@/lib/validations/notification";
import type { UserNotification } from "@/types/database.types";

function formatDateAndTimeForCell(
  iso: string | null | undefined,
  localeTag: string,
): { dateLine: string; timeLine: string } | null {
  if (iso == null || iso === "") {
    return null;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return {
    dateLine: d.toLocaleDateString(localeTag, { dateStyle: "medium" }),
    timeLine: d.toLocaleTimeString(localeTag, { timeStyle: "short" }),
  };
}

/** Replaces the stored admin-mirror prefix with the localized "[Admin] " label for display. */
function formatInAppTitleForDisplay(raw: string, mirrorDisplayPrefix: string): string {
  const title = safeDisplay(raw, "—");
  if (title === "—") {
    return title;
  }
  if (title.startsWith(ADMIN_IN_APP_MIRROR_TITLE_PREFIX)) {
    const rest = title.slice(ADMIN_IN_APP_MIRROR_TITLE_PREFIX.length).replace(/^\s+/, "");
    return `${mirrorDisplayPrefix}${rest}`;
  }
  return title;
}

function getInAppNotificationHref(n: UserNotification): string {
  const payload = parseInAppNotificationPayload(n.type, n.payload);
  if (payload == null) {
    return "/dashboard";
  }
  if ("contactId" in payload) {
    return `/contacts/${payload.contactId}`;
  }
  return `/companies/${payload.companyId}`;
}

type InAppT = ReturnType<typeof useT<"inAppNotifications">>;

function notificationTypeLabel(kind: string, t: InAppT): string {
  switch (kind) {
    case "reminder_assigned":
      return t("types.reminder_assigned");
    case "timeline_on_company":
      return t("types.timeline_on_company");
    case "comment_reply":
      return t("types.comment_reply");
    case "company_owner_assigned":
      return t("types.company_owner_assigned");
    case "contact_assigned":
      return t("types.contact_assigned");
    default:
      return t("typeUnknown");
  }
}

function InAppNotificationsTable({ userId }: { userId: string }) {
  const t = useT("inAppNotifications");
  const localeTag = useNumberLocaleTag();
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);
  const pageSize = IN_APP_NOTIFICATIONS_PAGE_SIZE;
  const [page, setPage] = useState(0);

  useInAppNotificationsRealtime(userId, queryClient);

  const { data, isPending, isFetching } = useQuery({
    queryKey: ["in-app-notifications", userId, page],
    queryFn: () => listNotificationsForUserPage(supabase, userId, { page, pageSize }),
    placeholderData: keepPreviousData,
  });

  const total = data?.total ?? 0;
  const rows = data?.rows ?? [];

  useEffect(() => {
    if (data === undefined) {
      return;
    }
    const maxPage = Math.max(0, Math.ceil(data.total / pageSize) - 1);
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [data, page]);

  const fromDisplay = total === 0 ? 0 : page * pageSize + 1;
  const toDisplay = Math.min(total, (page + 1) * pageSize);
  const hasPrev = page > 0;
  const hasNext = (page + 1) * pageSize < total;

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
          cell: ({ row }) => {
            const parts = formatDateAndTimeForCell(row.original.created_at, localeTag);
            if (parts == null) {
              return "—";
            }
            return (
              <div className="flex min-w-0 w-full max-w-30 flex-col gap-0.5 text-sm tabular-nums leading-snug sm:max-w-28">
                <span className="text-foreground wrap-anywhere">{parts.dateLine}</span>
                <span className="text-muted-foreground text-xs leading-tight">{parts.timeLine}</span>
              </div>
            );
          },
        },
        {
          id: "title",
          header: t("colTitle"),
          cell: ({ row }) => {
            const n = row.original;
            return (
              <div className="min-w-0 max-w-md">
                <div className="wrap-anywhere hyphens-auto font-medium text-foreground">
                  {formatInAppTitleForDisplay(safeDisplay(n.title, "—"), t("mirrorTitlePrefix"))}
                </div>
                {n.body != null && n.body.trim() !== "" && (
                  <p className="text-muted-foreground mt-1 line-clamp-3 text-sm wrap-anywhere hyphens-auto">
                    {n.body}
                  </p>
                )}
              </div>
            );
          },
        },
        {
          id: "type",
          header: t("colType"),
          cell: ({ row }) => notificationTypeLabel(row.original.type, t),
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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("pageTitle")}</h1>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{t("pageDescription")}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="w-full shrink-0 sm:w-auto"
          onClick={() => {
            markAllMutation.mutate();
          }}
          disabled={markAllMutation.isPending || total === 0}
        >
          {markAllMutation.isPending ? t("markAllReadPending") : t("markAllRead")}
        </Button>
      </div>

      <Card className="border-border rounded-xl shadow-sm">
        <CardContent className="p-4 sm:p-6">
          {isPending && data === undefined ? (
            <LoadingState count={6} className="space-y-3" itemClassName="h-20 w-full" />
          ) : total === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm sm:py-10">{t("empty")}</p>
          ) : (
            <>
              <ul className="list-none space-y-4 md:hidden">
                {rows.map((n) => {
                  const isUnread = n.read_at == null;
                  const href = getInAppNotificationHref(n);
                  const dateParts = formatDateAndTimeForCell(n.created_at, localeTag);
                  return (
                    <li
                      key={n.id}
                      className={cn(
                        "rounded-xl bg-card p-4 text-card-foreground text-sm shadow-sm ring-1 ring-border/40",
                        isUnread && "bg-muted/40",
                      )}
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1 text-sm tabular-nums">
                            {dateParts == null ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <>
                                <p className="text-foreground font-medium">{dateParts.dateLine}</p>
                                <p className="text-muted-foreground text-xs leading-tight">
                                  {dateParts.timeLine}
                                </p>
                              </>
                            )}
                          </div>
                          <Badge
                            variant="secondary"
                            className="max-w-[min(12rem,55%)] shrink-0 text-left text-xs font-normal leading-snug wrap-anywhere whitespace-normal! sm:max-w-xs"
                          >
                            {notificationTypeLabel(n.type, t)}
                          </Badge>
                        </div>
                        <div className="min-w-0">
                          <p className="text-base font-semibold leading-snug text-foreground wrap-anywhere hyphens-auto">
                            {formatInAppTitleForDisplay(safeDisplay(n.title, "—"), t("mirrorTitlePrefix"))}
                          </p>
                          {n.body != null && n.body.trim() !== "" && (
                            <p className="text-muted-foreground mt-2 text-sm leading-relaxed wrap-anywhere hyphens-auto">
                              {n.body}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 border-border border-t pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                          <Button variant="ghost" size="sm" className="h-10 w-full justify-center sm:w-auto" asChild>
                            <Link
                              href={href}
                              aria-label={t("openLinkAria")}
                              onClick={() => {
                                if (n.read_at == null) {
                                  markOneMutation.mutate(n.id);
                                }
                              }}
                            >
                              <ExternalLink className="mr-1.5 h-4 w-4 shrink-0" aria-hidden />
                              {t("openLink")}
                            </Link>
                          </Button>
                          {n.read_at == null && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-10 w-full sm:w-auto"
                              onClick={() => {
                                markOneMutation.mutate(n.id);
                              }}
                              disabled={markOneMutation.isPending}
                            >
                              {t("markRead")}
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="hidden overflow-x-auto rounded-md border border-border md:block">
                <Table className="table-fixed">
                  <TableHeader>
                    {table.getHeaderGroups().map((hg) => (
                      <TableRow key={hg.id}>
                        {hg.headers.map((h) => (
                          <TableHead
                            key={h.id}
                            className={cn(
                              h.column.id === "created_at" && "w-28 min-w-28 max-w-28 px-1.5",
                              h.column.id === "title" && "w-[50%] min-w-0",
                              h.column.id === "type" && "w-36",
                              h.column.id === "actions" && "w-36",
                            )}
                          >
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
                            <TableCell
                              key={cell.id}
                              className={cn(
                                "align-top",
                                (cell.column.id === "title" || cell.column.id === "created_at") &&
                                  "min-w-0 whitespace-normal",
                                cell.column.id === "created_at" && "px-1.5",
                              )}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div
                className={cn(
                  "mt-6 flex flex-col gap-3 border-border border-t pt-4 sm:flex-row sm:items-center sm:justify-between",
                  isFetching && "opacity-80",
                )}
              >
                <p className="text-muted-foreground text-sm tabular-nums">
                  {t("paginationSummary", { from: fromDisplay, to: toDisplay, total })}
                </p>
                <div className="flex items-center justify-center gap-2 sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!hasPrev || isFetching}
                    onClick={() => {
                      setPage((p) => Math.max(0, p - 1));
                    }}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4 shrink-0" aria-hidden />
                    {t("paginationPrev")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!hasNext || isFetching}
                    onClick={() => {
                      setPage((p) => p + 1);
                    }}
                  >
                    {t("paginationNext")}
                    <ChevronRight className="ml-1 h-4 w-4 shrink-0" aria-hidden />
                  </Button>
                </div>
              </div>
            </>
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
