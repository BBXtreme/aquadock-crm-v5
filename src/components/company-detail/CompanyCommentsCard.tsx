"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { CommentComposer } from "@/components/features/comments/CommentComposer";
import { CommentItem } from "@/components/features/comments/CommentItem";
import { flattenCommentThread } from "@/components/features/comments/flatten-comment-thread";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  createCompanyComment,
  deleteComment,
  listCompanyComments,
  updateComment,
} from "@/lib/actions/comments";
import { getCurrentUserClient } from "@/lib/auth/get-current-user-client";
import { useNumberLocaleTag, useT } from "@/lib/i18n/use-translations";
import type { CommentWithAuthor } from "@/types/database.types";

const MAX_COMMENT_DEPTH = 32;

type CompanyCommentsCardProps = {
  companyId: string;
};

export default function CompanyCommentsCard({ companyId }: CompanyCommentsCardProps) {
  const t = useT("comments");
  const localeTag = useNumberLocaleTag();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [replyParent, setReplyParent] = useState<CommentWithAuthor | null>(null);
  const composerRef = useRef<HTMLDivElement>(null);

  const queryKey = useMemo(() => ["comments", "company", companyId] as const, [companyId]);

  const { data: currentUser } = useQuery({
    queryKey: ["user"],
    queryFn: getCurrentUserClient,
  });

  const {
    data: comments = [],
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey,
    queryFn: () => listCompanyComments(companyId),
  });

  const { ordered, depthById } = useMemo(() => {
    const flat = flattenCommentThread(comments);
    const depth = new Map<string, number>();
    for (const c of flat) {
      if (!c.parent_id) {
        depth.set(c.id, 0);
        continue;
      }
      const parentDepth = depth.get(c.parent_id);
      const next = parentDepth === undefined ? 0 : Math.min(parentDepth + 1, MAX_COMMENT_DEPTH);
      depth.set(c.id, next);
    }
    return { ordered: flat, depthById: depth };
  }, [comments]);

  const createMutation = useMutation({
    mutationFn: () =>
      createCompanyComment({
        companyId,
        bodyMarkdown: draft.trim(),
        parentId: replyParent?.id ?? null,
      }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<CommentWithAuthor[]>(queryKey);
      if (currentUser?.id) {
        const now = new Date().toISOString();
        const optimistic: CommentWithAuthor = {
          id: `optimistic-${Date.now()}`,
          entity_type: "company",
          entity_id: companyId,
          parent_id: replyParent?.id ?? null,
          body_markdown: draft.trim(),
          created_at: now,
          updated_at: now,
          created_by: currentUser.id,
          updated_by: currentUser.id,
          deleted_at: null,
          deleted_by: null,
          profiles: {
            display_name: currentUser.display_name ?? null,
            avatar_url: currentUser.avatar_url ?? null,
          },
        };
        queryClient.setQueryData<CommentWithAuthor[]>(queryKey, (old) => [...(old ?? []), optimistic]);
      }
      return { previous };
    },
    onError: (err: unknown, _v, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(queryKey, ctx.previous);
      }
      const message = err instanceof Error ? err.message : t("unknownError");
      toast.error(t("toastCreateFailed"), { description: message });
    },
    onSuccess: () => {
      setDraft("");
      setReplyParent(null);
      toast.success(t("toastCreated"));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ commentId, bodyMarkdown }: { commentId: string; bodyMarkdown: string }) =>
      updateComment({ commentId, bodyMarkdown }),
    onMutate: async ({ commentId, bodyMarkdown }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<CommentWithAuthor[]>(queryKey);
      const nowIso = new Date().toISOString();
      queryClient.setQueryData<CommentWithAuthor[]>(queryKey, (old) =>
        (old ?? []).map((c) =>
          c.id === commentId ? { ...c, body_markdown: bodyMarkdown, updated_at: nowIso } : c,
        ),
      );
      return { previous };
    },
    onError: (err: unknown, _v, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(queryKey, ctx.previous);
      }
      const message = err instanceof Error ? err.message : t("unknownError");
      toast.error(t("toastUpdateFailed"), { description: message });
    },
    onSuccess: () => {
      toast.success(t("toastUpdated"));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => deleteComment({ commentId }),
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<CommentWithAuthor[]>(queryKey);
      queryClient.setQueryData<CommentWithAuthor[]>(queryKey, (old) =>
        (old ?? []).filter((c) => c.id !== commentId),
      );
      return { previous };
    },
    onError: (err: unknown, _id, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(queryKey, ctx.previous);
      }
      const message = err instanceof Error ? err.message : t("unknownError");
      toast.error(t("toastDeleteFailed"), { description: message });
    },
    onSuccess: () => {
      toast.success(t("toastDeleted"));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const handleReply = useCallback((row: CommentWithAuthor) => {
    setReplyParent(row);
    setDraft("");
    requestAnimationFrame(() => {
      composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, []);

  const handleUpdate = useCallback(
    async (commentId: string, bodyMarkdown: string) => {
      await updateMutation.mutateAsync({ commentId, bodyMarkdown });
    },
    [updateMutation],
  );

  const handleDelete = useCallback(
    async (commentId: string) => {
      await deleteMutation.mutateAsync(commentId);
    },
    [deleteMutation],
  );

  const handleSubmit = useCallback(async () => {
    await createMutation.mutateAsync();
  }, [createMutation]);

  const replyBanner =
    replyParent != null
      ? t("replyingTo", { name: replyParent.profiles?.display_name?.trim() || t("anonymousUser") })
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-5 w-5" aria-hidden />
          {t("cardTitle", { count: comments.length })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div ref={composerRef}>
          <CommentComposer
            title={t("addTitle")}
            value={draft}
            onChange={setDraft}
            isSubmitting={createMutation.isPending}
            disabled={!currentUser}
            replyBanner={replyBanner}
            onCancelReply={() => setReplyParent(null)}
            onSubmit={handleSubmit}
          />
        </div>

        {isPending ? (
          <LoadingState count={3} />
        ) : isError ? (
          <p className="text-destructive text-sm" role="alert">
            {t("loadError", { message: error instanceof Error ? error.message : String(error) })}
          </p>
        ) : ordered.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        ) : (
          <ul className="space-y-3">
            {ordered.map((c) => (
              <li key={c.id}>
                <CommentItem
                  comment={c}
                  currentUserId={currentUser?.id ?? null}
                  localeTag={localeTag}
                  depth={depthById.get(c.id) ?? 0}
                  onReply={handleReply}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
