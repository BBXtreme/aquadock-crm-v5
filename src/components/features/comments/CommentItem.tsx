"use client";

import { CornerDownRight, FileText, Link2, Paperclip, Pencil, Reply, Trash2, X } from "lucide-react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { CommentMarkdownPreview } from "@/components/features/comments/CommentMarkdownPreview";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { deleteCommentAttachment, getCommentAttachmentSignedUrl } from "@/lib/actions/comments";
import { openSignedStorageUrl } from "@/lib/client/open-signed-storage-url";
import { uploadCommentAttachmentsForComment } from "@/lib/client/upload-comment-attachments";
import { useT } from "@/lib/i18n/use-translations";
import { cn } from "@/lib/utils";
import { formatFileSizeBytes } from "@/lib/utils/format-file-size";
import type { CommentWithAuthor } from "@/types/database.types";

function displayInitials(name: string | null | undefined, userId: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  return userId.slice(0, 2).toUpperCase();
}

function isLikelyEdited(c: CommentWithAuthor): boolean {
  if (!c.created_at || !c.updated_at) {
    return false;
  }
  return new Date(c.updated_at).getTime() - new Date(c.created_at).getTime() > 1500;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

function formatAbsoluteTime(iso: string | null | undefined, localeTag: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(localeTag, { dateStyle: "medium", timeStyle: "short" });
}

/** Compact, scannable timestamp: "jetzt", "vor 5 Min.", "gestern 14:32", "14. Apr 2026". */
function formatRelativeTime(
  iso: string | null | undefined,
  localeTag: string,
  justNowLabel: string,
  nowMs: number = Date.now(),
): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = then - nowMs;
  const abs = Math.abs(diffMs);
  if (abs < MINUTE) return justNowLabel;
  const rtf = new Intl.RelativeTimeFormat(localeTag, { numeric: "auto" });
  if (abs < HOUR) return rtf.format(Math.round(diffMs / MINUTE), "minute");
  if (abs < DAY) return rtf.format(Math.round(diffMs / HOUR), "hour");
  if (abs < WEEK) return rtf.format(Math.round(diffMs / DAY), "day");
  return new Date(iso).toLocaleDateString(localeTag, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type CommentItemProps = {
  comment: CommentWithAuthor;
  companyId: string;
  currentUserId: string | null;
  localeTag: string;
  /** Visual indentation depth, capped by the parent (typically 0..2). */
  depth?: number;
  /** Display name of the parent comment's author; shown as "↳ Replying to …" when depth is capped. */
  parentAuthorName?: string | null;
  isHighlighted?: boolean;
  onReply: (comment: CommentWithAuthor) => void;
  onUpdate: (commentId: string, bodyMarkdown: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onAttachmentsChanged?: () => void;
};

export function CommentItem({
  comment,
  companyId,
  currentUserId,
  localeTag,
  depth = 0,
  parentAuthorName = null,
  isHighlighted = false,
  onReply,
  onUpdate,
  onDelete,
  onAttachmentsChanged,
}: CommentItemProps) {
  const t = useT("comments");
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body_markdown);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [openingAttachmentId, setOpeningAttachmentId] = useState<string | null>(null);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const [editUploading, setEditUploading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) {
      setEditBody(comment.body_markdown);
    }
  }, [comment.body_markdown, editing]);

  useEffect(() => {
    if (!isHighlighted) {
      return;
    }
    rootRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [isHighlighted]);

  const isOwner = currentUserId !== null && comment.created_by === currentUserId;
  const authorName = comment.profiles?.display_name?.trim() || t("anonymousUser");
  const createdRelative = formatRelativeTime(comment.created_at, localeTag, t("timeJustNow"));
  const createdAbsolute = formatAbsoluteTime(comment.created_at, localeTag);
  const updatedAbsolute = formatAbsoluteTime(comment.updated_at, localeTag);
  const showParentHint = depth >= 2 && Boolean(parentAuthorName);

  const canSaveEdit = editBody.trim().length > 0 && !saving;

  const handleCopyLink = useCallback(async () => {
    if (typeof window === "undefined") return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("commentId", comment.id);
      await navigator.clipboard.writeText(url.toString());
      toast.success(t("copyLinkCopied"));
    } catch {
      toast.error(t("copyLinkFailed"));
    }
  }, [comment.id, t]);

  const handleSaveEdit = useCallback(async () => {
    if (!canSaveEdit) {
      return;
    }
    setSaving(true);
    try {
      await onUpdate(comment.id, editBody.trim());
      setEditing(false);
    } catch {
      // Parent mutation onError shows toast; keep editor open for retry.
    } finally {
      setSaving(false);
    }
  }, [canSaveEdit, comment.id, editBody, onUpdate]);

  const handleCancelEdit = useCallback(() => {
    setEditing(false);
    setEditBody(comment.body_markdown);
  }, [comment.body_markdown]);

  const handleEditKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSaveEdit) {
      e.preventDefault();
      void handleSaveEdit();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const attachments = comment.comment_attachments ?? [];

  const handleOpenAttachment = async (attachmentId: string, fileName: string) => {
    setOpeningAttachmentId(attachmentId);
    try {
      const { signedUrl } = await getCommentAttachmentSignedUrl({ attachmentId });
      await openSignedStorageUrl(signedUrl, fileName);
    } catch (e) {
      const message = e instanceof Error ? e.message : t("unknownError");
      toast.error(t("attachmentOpenFailed"), { description: message });
    } finally {
      setOpeningAttachmentId(null);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    setDeletingAttachmentId(attachmentId);
    try {
      await deleteCommentAttachment({ attachmentId });
      onAttachmentsChanged?.();
    } catch (e) {
      const message = e instanceof Error ? e.message : t("unknownError");
      toast.error(t("attachmentDeleteFailed"), { description: message });
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  const handleEditFilesSelected = async (list: FileList | null) => {
    if (list === null || list.length === 0) {
      return;
    }
    const files = Array.from(list);
    if (editFileInputRef.current) {
      editFileInputRef.current.value = "";
    }
    setEditUploading(true);
    try {
      const result = await uploadCommentAttachmentsForComment({
        companyId,
        commentId: comment.id,
        files,
      });
      if (!result.ok) {
        if (result.kind === "too_large") {
          toast.error(t("attachmentTooLargeToast"));
        } else if (result.kind === "upload") {
          toast.error(t("attachmentUploadFailed"), { description: result.message });
        } else {
          toast.error(t("attachmentRegisterFailed"), { description: result.message });
        }
        return;
      }
      onAttachmentsChanged?.();
    } finally {
      setEditUploading(false);
    }
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(comment.id);
      setDeleteOpen(false);
    } catch {
      // Parent mutation onError shows toast.
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      ref={rootRef}
      id={`comment-${comment.id}`}
      className={cn(
        "group rounded-lg border border-border bg-card/50 p-3 transition-colors duration-500",
        depth === 1 && "ml-5 border-l-2 border-l-primary/30 pl-3 sm:ml-6",
        depth >= 2 && "ml-5 border-l-2 border-l-primary/20 pl-3 sm:ml-6",
        isHighlighted && "border-primary/40 bg-primary/5 ring-1 ring-primary/20",
      )}
    >
      <div className="flex gap-2.5">
        <Avatar size="sm" className="mt-0.5">
          {comment.profiles?.avatar_url ? (
            <AvatarImage src={comment.profiles.avatar_url} alt="" />
          ) : null}
          <AvatarFallback className="text-xs">{displayInitials(authorName, comment.created_by)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-1.5">
          {showParentHint ? (
            <div className="flex items-center gap-1 text-muted-foreground text-[11px]">
              <CornerDownRight className="h-3 w-3" aria-hidden />
              <span className="truncate">
                {t("replyToInline", { name: parentAuthorName ?? "" })}
              </span>
            </div>
          ) : null}
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="min-w-0 text-sm">
              <span className="font-medium text-foreground">{authorName}</span>
              {createdRelative ? (
                <>
                  <span className="text-muted-foreground text-xs"> · </span>
                  <time
                    dateTime={comment.created_at ?? undefined}
                    title={createdAbsolute}
                    className="text-muted-foreground text-xs"
                  >
                    {createdRelative}
                  </time>
                </>
              ) : null}
              {isLikelyEdited(comment) ? (
                <>
                  <span className="text-muted-foreground text-xs"> · </span>
                  <time
                    dateTime={comment.updated_at ?? undefined}
                    title={t("editedTooltip", { time: updatedAbsolute })}
                    className="text-muted-foreground text-xs"
                  >
                    {t("edited")}
                  </time>
                </>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-0.5 opacity-80 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => onReply(comment)}
              >
                <Reply className="mr-1 h-3.5 w-3.5" aria-hidden />
                {t("reply")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => void handleCopyLink()}
                aria-label={t("copyLink")}
                title={t("copyLink")}
              >
                <Link2 className="h-3.5 w-3.5" aria-hidden />
              </Button>
              {isOwner ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setEditBody(comment.body_markdown);
                      setEditing(true);
                    }}
                    aria-label={t("edit")}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteOpen(true)}
                    aria-label={t("delete")}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </>
              ) : null}
            </div>
          </div>

          {editing ? (
            <div className="space-y-2">
              <Textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                onKeyDown={handleEditKeyDown}
                rows={6}
                className="text-sm"
                aria-label={t("edit")}
              />
              {isOwner ? (
                <div className="space-y-2 rounded-md border border-border/60 bg-muted/15 p-2">
                  <p className="text-muted-foreground text-xs">{t("attachmentsLabel")}</p>
                  {attachments.length > 0 ? (
                    <ul className="space-y-1.5">
                      {attachments.map((a) => (
                        <li key={a.id} className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-auto min-h-8 min-w-0 flex-1 justify-start gap-2 px-2 py-1.5 font-normal"
                            disabled={openingAttachmentId === a.id || deletingAttachmentId === a.id}
                            onClick={() => void handleOpenAttachment(a.id, a.file_name)}
                          >
                            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                            <span className="min-w-0 flex-1 truncate text-left text-sm">{a.file_name}</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                            disabled={deletingAttachmentId === a.id || editUploading}
                            onClick={() => void handleDeleteAttachment(a.id)}
                            aria-label={t("attachmentRemoveFromNote", { name: a.file_name })}
                          >
                            <X className="h-4 w-4" aria-hidden />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground text-xs">{t("editAttachmentsEmpty")}</p>
                  )}
                  <input
                    ref={editFileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => void handleEditFilesSelected(e.target.files)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={editUploading}
                    onClick={() => editFileInputRef.current?.click()}
                  >
                    <Paperclip className="h-3.5 w-3.5" aria-hidden />
                    {t("editAddAttachments")}
                  </Button>
                </div>
              ) : null}
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={() => void handleSaveEdit()} disabled={!canSaveEdit}>
                  {saving ? t("saving") : t("save")}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={handleCancelEdit} disabled={saving}>
                  {t("cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <CommentMarkdownPreview markdown={comment.body_markdown} className="text-sm" />
              {attachments.length > 0 ? (
                <ul
                  className="mt-2 space-y-1.5 rounded-md border border-border/60 bg-muted/20 px-2 py-2"
                  aria-label={t("attachmentsLabel")}
                >
                  {attachments.map((a) => (
                    <li key={a.id}>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-auto w-full max-w-full justify-start gap-2 px-2 py-1.5 text-left font-normal"
                        disabled={openingAttachmentId === a.id}
                        onClick={() => void handleOpenAttachment(a.id, a.file_name)}
                        aria-label={t("attachmentDownload", { name: a.file_name })}
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-sm">{a.file_name}</span>
                        {a.byte_size !== null && a.byte_size !== undefined ? (
                          <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                            {formatFileSizeBytes(a.byte_size, localeTag)}
                          </span>
                        ) : null}
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteConfirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleConfirmDelete()} disabled={deleting}>
              {t("deleteConfirmAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
