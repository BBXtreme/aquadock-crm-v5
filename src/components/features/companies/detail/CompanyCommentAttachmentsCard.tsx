"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText, FolderOpen, MessageSquare } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/LoadingState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCommentAttachmentSignedUrl, listCompanyCommentAttachments } from "@/lib/actions/comments";
import { getCurrentUserClient } from "@/lib/auth/get-current-user-client";
import { openSignedStorageUrl } from "@/lib/client/open-signed-storage-url";
import { useNumberLocaleTag, useT } from "@/lib/i18n/use-translations";
import { cn } from "@/lib/utils";
import { formatFileSizeBytes } from "@/lib/utils/format-file-size";
import { COMMENT_ENTITY_COMPANY } from "@/lib/validations/comment";
import type { CompanyCommentAttachmentListItem } from "@/types/database.types";

export const companyCommentAttachmentsQueryKey = (companyId: string) =>
  ["comments", "company", companyId, "file-library"] as const;

function noteExcerpt(bodyMarkdown: string, maxChars: number): string {
  const flat = bodyMarkdown.replace(/\s+/g, " ").trim();
  if (flat.length <= maxChars) {
    return flat;
  }
  return `${flat.slice(0, maxChars).trimEnd()}…`;
}

type CompanyCommentAttachmentsCardProps = {
  companyId: string;
};

export default function CompanyCommentAttachmentsCard({ companyId }: CompanyCommentAttachmentsCardProps) {
  const t = useT("comments");
  const localeTag = useNumberLocaleTag();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [openingId, setOpeningId] = useState<string | null>(null);

  const { data: currentUser, isPending: sessionPending } = useQuery({
    queryKey: ["user"],
    queryFn: getCurrentUserClient,
  });

  const qk = companyCommentAttachmentsQueryKey(companyId);
  const { data: rows = [], isPending: listPending, isError, error } = useQuery({
    queryKey: qk,
    queryFn: () => listCompanyCommentAttachments(companyId),
    staleTime: 0,
    enabled: !sessionPending && currentUser !== null && currentUser !== undefined,
  });

  const handleOpenFile = useCallback(
    async (attachmentId: string, fileName: string) => {
      setOpeningId(attachmentId);
      try {
        const { signedUrl } = await getCommentAttachmentSignedUrl({ attachmentId });
        await openSignedStorageUrl(signedUrl, fileName);
      } catch (e) {
        const message = e instanceof Error ? e.message : t("unknownError");
        toast.error(t("attachmentOpenFailed"), { description: message });
      } finally {
        setOpeningId(null);
      }
    },
    [t],
  );

  const goToComment = useCallback(
    (commentId: string) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("commentId", commentId);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      requestAnimationFrame(() => {
        document.getElementById(`comment-${commentId}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    },
    [pathname, router, searchParams],
  );

  if (!sessionPending && currentUser === null) {
    return null;
  }

  const showLoading = sessionPending || listPending;
  const empty = !showLoading && !isError && rows.length === 0;
  const errMessage = error instanceof Error ? error.message : error !== null && error !== undefined ? String(error) : "";

  return (
    <Card className={cn(empty ? "border-dashed" : undefined)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FolderOpen className="h-5 w-5" aria-hidden />
          {t("attachmentsLibraryTitle")}
        </CardTitle>
        <p className="text-muted-foreground text-xs sm:text-sm">{t("attachmentsLibrarySubtitle")}</p>
      </CardHeader>
      <CardContent>
        {showLoading ? (
          <LoadingState count={3} />
        ) : isError ? (
          <p className="text-destructive text-sm" role="alert">
            {t("attachmentsLibraryLoadError", { message: errMessage })}
          </p>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/15 px-4 py-6 text-center text-muted-foreground text-sm">
            {t("attachmentsLibraryEmpty")}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border/70">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[8rem]">{t("attachmentsLibraryColFile")}</TableHead>
                  <TableHead className="hidden w-[7rem] md:table-cell">{t("attachmentsLibraryColSize")}</TableHead>
                  <TableHead className="hidden w-[10rem] lg:table-cell">{t("attachmentsLibraryColUploaded")}</TableHead>
                  <TableHead className="min-w-[12rem] max-w-[28rem]">{t("attachmentsLibraryColNote")}</TableHead>
                  <TableHead className="w-[8rem] text-end">{t("attachmentsLibraryColActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <AttachmentTableRow
                    key={row.id}
                    row={row}
                    companyId={companyId}
                    localeTag={localeTag}
                    loading={openingId === row.id}
                    onOpen={() => void handleOpenFile(row.id, typeof row.file_name === "string" ? row.file_name : "")}
                    goToComment={goToComment}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AttachmentTableRow(props: {
  row: CompanyCommentAttachmentListItem;
  companyId: string;
  localeTag: string;
  loading: boolean;
  onOpen: () => void;
  goToComment: (commentId: string) => void;
}) {
  const { row, companyId, localeTag, loading, onOpen, goToComment } = props;
  const t = useT("comments");

  const parent = row.comments ?? null;
  const excerptRaw = typeof parent?.body_markdown === "string" ? parent.body_markdown : "";
  const excerpt = excerptRaw.length > 0 ? noteExcerpt(excerptRaw, 120) : "—";

  const uploadedDisplay =
    typeof row.created_at === "string" && row.created_at.length > 0
      ? new Date(row.created_at).toLocaleString(localeTag, { dateStyle: "medium", timeStyle: "short" })
      : "";

  const sizeDisplay =
    row.byte_size !== null && row.byte_size !== undefined ? formatFileSizeBytes(row.byte_size, localeTag) : "—";

  const commentsId =
    typeof parent?.id === "string" &&
    parent.id.length > 0 &&
    parent.entity_id === companyId &&
    parent.entity_type === COMMENT_ENTITY_COMPANY
      ? parent.id
      : null;

  return (
    <TableRow>
      <TableCell className="font-medium">
        <Button
          type="button"
          variant="link"
          className="h-auto min-h-0 max-w-[min(28rem,calc(100vw-10rem))] justify-start truncate px-0 py-0 text-left font-medium"
          onClick={onOpen}
          disabled={loading}
          aria-label={t("attachmentDownloadAria", { name: row.file_name })}
        >
          <FileText className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          <span className="truncate">{row.file_name}</span>
        </Button>
      </TableCell>
      <TableCell className="hidden text-muted-foreground text-sm tabular-nums md:table-cell">{sizeDisplay}</TableCell>
      <TableCell className="hidden text-muted-foreground text-xs lg:table-cell">{uploadedDisplay}</TableCell>
      <TableCell>
        <p className="line-clamp-2 max-w-xl text-muted-foreground text-sm" title={excerptRaw.slice(0, 500)}>
          {excerpt}
        </p>
      </TableCell>
      <TableCell className="text-end">
        {commentsId !== null ? (
          <Button type="button" variant="outline" size="xs" className="h-8 gap-1" onClick={() => goToComment(commentsId)}>
            <MessageSquare className="h-3 w-3" aria-hidden />
            <span className="hidden sm:inline">{t("attachmentsLibraryGoToNote")}</span>
            <span className="sm:hidden">{t("attachmentsLibraryGoToNoteShort")}</span>
          </Button>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}
