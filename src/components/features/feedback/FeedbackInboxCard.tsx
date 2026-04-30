"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type AdminFeedbackListRow, deleteAdminFeedbackRow, listAdminFeedbackRows } from "@/lib/actions/feedback";
import type { FeedbackTopicId } from "@/lib/constants/feedback-options";
import { FEEDBACK_TOPIC_IDS } from "@/lib/constants/feedback-options";
import { useNumberLocaleTag, useT } from "@/lib/i18n/use-translations";
import { cn } from "@/lib/utils";
import { safeDisplay } from "@/lib/utils/data-format";

const AUTHOR_AND_SUBMITTED_COLUMN_ID = "author_and_submitted";
const TOPIC_AND_SENTIMENT_COLUMN_ID = "topic_and_sentiment";

function formatSubmittedAtParts(
  iso: string | null | undefined,
  localeTag: string,
): { dateLine: string; timeLine: string } | null {
  if (iso === null || iso === undefined || iso === "") {
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

function confirmBodyPreview(body: string, maxChars: number): string {
  const t = body.trim();
  if (t.length <= maxChars) {
    return t;
  }
  return `${t.slice(0, maxChars - 1)}…`;
}

export default function FeedbackInboxCard() {
  const t = useT("feedback");
  const localeTag = useNumberLocaleTag();
  const queryClient = useQueryClient();
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { data: rows, isLoading, isError } = useQuery({
    queryKey: ["admin-feedback-rows"],
    queryFn: () => listAdminFeedbackRows(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminFeedbackRow(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-feedback-rows"] });
      toast.success(t("inboxDeleteSuccess"));
      setPendingDeleteId(null);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : t("inboxDeleteError");
      toast.error(t("inboxDeleteError"), { description: msg });
    },
  });

  const openDeleteDialog = useCallback((id: string) => {
    setPendingDeleteId(id);
  }, []);

  const columns = useMemo(
    () =>
      [
        {
          id: AUTHOR_AND_SUBMITTED_COLUMN_ID,
          header: t("inboxColAuthorAndSubmitted"),
          cell: ({ row }) => {
            const a = row.original.authorDisplay.trim();
            const authorLabel = a === "" ? t("inboxAuthorUnknown") : a;
            const parts = formatSubmittedAtParts(row.original.created_at, localeTag);
            return (
              <div className="flex max-w-48 flex-col gap-1 leading-tight">
                <span className="text-foreground text-sm">{authorLabel}</span>
                {parts === null ? (
                  <span className="tabular-nums text-muted-foreground text-xs">—</span>
                ) : (
                  <div className="flex flex-col gap-0.5 tabular-nums text-muted-foreground text-xs">
                    <span className="whitespace-nowrap">{parts.dateLine}</span>
                    <span className="whitespace-nowrap">{parts.timeLine}</span>
                  </div>
                )}
              </div>
            );
          },
        },
        {
          id: TOPIC_AND_SENTIMENT_COLUMN_ID,
          header: t("inboxColTopic"),
          cell: ({ row }) => {
            const topicId = row.original.topic;
            const labels: Record<FeedbackTopicId, string> = {
              general: t("topics.general"),
              bug: t("topics.bug"),
              feature: t("topics.feature"),
              ux: t("topics.ux"),
              openmap: t("topics.openmap"),
              email: t("topics.email"),
              ai: t("topics.ai"),
              other: t("topics.other"),
            };
            const isKnown = (FEEDBACK_TOPIC_IDS as readonly string[]).includes(topicId);
            const topicLabel = isKnown ? labels[topicId as FeedbackTopicId] : safeDisplay(topicId);
            return (
              <div className="flex max-w-44 flex-col gap-1 leading-tight">
                <span className="text-foreground text-sm">{topicLabel}</span>
                <span className="text-lg leading-none">{String(row.original.sentiment)}</span>
              </div>
            );
          },
        },
        {
          id: "page_and_body",
          header: t("inboxColPageAndMessage"),
          cell: ({ row }) => (
            <div className="flex max-w-md flex-col gap-2">
              <span className="break-all font-mono text-muted-foreground text-xs">
                {safeDisplay(row.original.page_url)}
              </span>
              <div className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words text-muted-foreground text-sm leading-relaxed">
                {String(row.original.body)}
              </div>
            </div>
          ),
        },
        {
          id: "screenshot",
          header: t("inboxColScreenshot"),
          cell: ({ row }) => {
            const url = row.original.screenshot_url;
            if (url === null || url === undefined || url === "") {
              return <span className="text-muted-foreground text-xs">{t("inboxNoScreenshot")}</span>;
            }
            return (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0"
                onClick={() => {
                  setLightboxUrl(url);
                }}
                aria-label={t("inboxScreenshotEnlarge")}
              >
                <Image
                  src={url}
                  alt=""
                  width={64}
                  height={40}
                  className="h-10 w-16 rounded border border-border object-cover"
                  unoptimized
                />
              </Button>
            );
          },
        },
        {
          id: "actions",
          header: () => <span className="sr-only">{t("inboxColActions")}</span>,
          cell: ({ row }) => (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              aria-label={t("inboxDeleteAria")}
              disabled={deleteMutation.isPending}
              onClick={() => {
                openDeleteDialog(row.original.id);
              }}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </Button>
          ),
        },
      ] satisfies ColumnDef<AdminFeedbackListRow>[],
    [t, localeTag, openDeleteDialog, deleteMutation.isPending],
  );

  const table = useReactTable({
    data: rows ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const pendingRow =
    pendingDeleteId === null ? undefined : (rows ?? []).find((r) => r.id === pendingDeleteId);
  const pendingPreview =
    pendingRow === undefined ? "" : confirmBodyPreview(pendingRow.body, 280);

  return (
    <Card className="shadow-sm">
      <CardHeader className="gap-2 border-border/40 border-b px-6 pb-5">
        <CardTitle className="font-heading text-xl">{t("inboxTitle")}</CardTitle>
        <CardDescription className="max-w-prose text-pretty text-muted-foreground text-sm leading-relaxed">
          {t("inboxDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-8 pt-6">
        {isLoading ? (
          <div className="space-y-2" role="status" aria-busy="true" aria-live="polite">
            <span className="sr-only">{t("inboxLoading")}</span>
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : null}

        {isError ? (
          <p className="text-destructive text-sm" role="alert">
            {t("inboxLoadError")}
          </p>
        ) : null}

        {!isLoading && !isError && (rows ?? []).length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("inboxEmpty")}</p>
        ) : null}

        {!isLoading && !isError && (rows ?? []).length > 0 ? (
          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={cn(
                          "align-top",
                          header.column.id === AUTHOR_AND_SUBMITTED_COLUMN_ID ||
                            header.column.id === TOPIC_AND_SENTIMENT_COLUMN_ID
                            ? "w-[1%] whitespace-normal pr-2"
                            : "whitespace-nowrap",
                        )}
                      >
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          "align-top",
                          (cell.column.id === AUTHOR_AND_SUBMITTED_COLUMN_ID ||
                            cell.column.id === TOPIC_AND_SENTIMENT_COLUMN_ID) &&
                            "w-[1%] pr-2",
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}

      </CardContent>

      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(next) => {
          if (!next) {
            setPendingDeleteId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("inboxDeleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription className="grid gap-2">
              <span>{t("inboxDeleteConfirmDescription")}</span>
              {pendingPreview !== "" ? (
                <span className="max-h-32 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-border bg-muted/20 p-2 text-muted-foreground text-sm leading-relaxed">
                  {pendingPreview}
                </span>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>{t("inboxDeleteCancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending || pendingDeleteId === null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (pendingDeleteId !== null) {
                  deleteMutation.mutate(pendingDeleteId);
                }
              }}
            >
              {deleteMutation.isPending ? t("inboxDeletePending") : t("inboxDeleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={lightboxUrl !== null} onOpenChange={(o) => !o && setLightboxUrl(null)}>
        <DialogContent className="max-w-4xl border-border bg-background p-4">
          <DialogHeader>
            <DialogTitle>{t("inboxScreenshotDialogTitle")}</DialogTitle>
          </DialogHeader>
          {lightboxUrl !== null ? (
            <div className="flex max-h-[80vh] justify-center overflow-auto">
              <Image
                src={lightboxUrl}
                alt=""
                width={1600}
                height={1200}
                className="max-h-[75vh] w-auto max-w-full object-contain"
                unoptimized
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
