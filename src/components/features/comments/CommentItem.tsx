"use client";

import { Pencil, Reply, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

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
import { useT } from "@/lib/i18n/use-translations";
import { cn } from "@/lib/utils";
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

type CommentItemProps = {
  comment: CommentWithAuthor;
  currentUserId: string | null;
  localeTag: string;
  depth?: number;
  isHighlighted?: boolean;
  onReply: (comment: CommentWithAuthor) => void;
  onUpdate: (commentId: string, bodyMarkdown: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
};

export function CommentItem({
  comment,
  currentUserId,
  localeTag,
  depth = 0,
  isHighlighted = false,
  onReply,
  onUpdate,
  onDelete,
}: CommentItemProps) {
  const t = useT("comments");
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body_markdown);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!editing) {
      setEditBody(comment.body_markdown);
    }
  }, [comment.body_markdown, editing]);

  const isOwner = currentUserId !== null && comment.created_by === currentUserId;
  const authorName = comment.profiles?.display_name?.trim() || t("anonymousUser");
  const created = comment.created_at
    ? new Date(comment.created_at).toLocaleString(localeTag, { dateStyle: "medium", timeStyle: "short" })
    : "";

  const handleSaveEdit = async () => {
    if (!editBody.trim()) {
      return;
    }
    setSaving(true);
    try {
      await onUpdate(comment.id, editBody.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(comment.id);
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className={cn(
        "group rounded-lg border border-border bg-card/50 p-3 transition-colors",
        depth > 0 && "ml-5 border-l-2 border-l-primary/30 pl-3 sm:ml-6",
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
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="min-w-0 text-sm">
              <span className="font-medium text-foreground">{authorName}</span>
              <span className="text-muted-foreground text-xs"> · {created}</span>
              {isLikelyEdited(comment) ? (
                <span className="text-muted-foreground text-xs"> · {t("edited")}</span>
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
              <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={6} className="text-sm" />
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={handleSaveEdit} disabled={saving || !editBody.trim()}>
                  {saving ? t("saving") : t("save")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                    setEditBody(comment.body_markdown);
                  }}
                  disabled={saving}
                >
                  {t("cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <CommentMarkdownPreview markdown={comment.body_markdown} className="text-sm" />
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
