"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronUp, MessageSquare, Phone, ShieldAlert, Sparkles, UserCheck } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { CommentComposer } from "@/components/features/comments/CommentComposer";
import { CommentItem } from "@/components/features/comments/CommentItem";
import { flattenCommentThread } from "@/components/features/comments/flatten-comment-thread";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  createCompanyComment,
  deleteComment,
  listCompanyComments,
  restoreOwnComment,
  updateComment,
} from "@/lib/actions/comments";
import { getCurrentUserClient } from "@/lib/auth/get-current-user-client";
import { useNumberLocaleTag, useT } from "@/lib/i18n/use-translations";
import { cn } from "@/lib/utils";
import type { CommentWithAuthor } from "@/types/database.types";

const MAX_COMMENT_DEPTH = 32;
const MAX_VISUAL_DEPTH = 2;
const HIGHLIGHT_DURATION_MS = 2500;
const VISIBLE_ROOT_LIMIT = 5;

type CompanyCommentsCardProps = {
  companyId: string;
};

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export default function CompanyCommentsCard({ companyId }: CompanyCommentsCardProps) {
  const t = useT("comments");
  const localeTag = useNumberLocaleTag();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [replyParent, setReplyParent] = useState<CommentWithAuthor | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [targetCommentId, setTargetCommentId] = useState<string | null>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasProcessedDeepLink = useRef(false);
  /** Tracks last hydrated company so we load localStorage draft on id change without clobbering another company's key. */
  const draftCompanyRef = useRef<string | null>(null);

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
    /** Feed must update immediately after create; avoid app-wide 60s stale window blocking refetch. */
    staleTime: 0,
  });

  const anonymousUserLabel = t("anonymousUser");

  const { ordered, depthById, nameById } = useMemo(() => {
    const flat = flattenCommentThread(comments);
    const depth = new Map<string, number>();
    const name = new Map<string, string>();
    for (const c of flat) {
      name.set(c.id, c.profiles?.display_name?.trim() || anonymousUserLabel);
      if (!c.parent_id) {
        depth.set(c.id, 0);
        continue;
      }
      const parentDepth = depth.get(c.parent_id);
      const next = parentDepth === undefined ? 0 : Math.min(parentDepth + 1, MAX_COMMENT_DEPTH);
      depth.set(c.id, next);
    }
    return { ordered: flat, depthById: depth, nameById: name };
  }, [comments, anonymousUserLabel]);

  /**
   * Overflow: when there are more than VISIBLE_ROOT_LIMIT root comments, collapse
   * the older ones behind a "show older notes" button. Clipping happens at root
   * boundaries so reply threads always stay intact.
   */
  const { visibleOrdered, hiddenRootsCount } = useMemo(() => {
    const rootIds: string[] = [];
    for (const c of ordered) {
      if (!c.parent_id) rootIds.push(c.id);
    }
    const hidden = Math.max(0, rootIds.length - VISIBLE_ROOT_LIMIT);
    if (showAll || hidden === 0) {
      return { visibleOrdered: ordered, hiddenRootsCount: 0 };
    }
    const firstVisibleRootId = rootIds[hidden];
    const startIdx = firstVisibleRootId
      ? ordered.findIndex((c) => c.id === firstVisibleRootId)
      : -1;
    return {
      visibleOrdered: startIdx >= 0 ? ordered.slice(startIdx) : ordered,
      hiddenRootsCount: hidden,
    };
  }, [ordered, showAll]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  /** Per-company draft persistence (item 9): hydrate on company change, persist on draft edits. */
  useEffect(() => {
    if (draftCompanyRef.current !== companyId) {
      draftCompanyRef.current = companyId;
      setReplyParent(null);
      try {
        const raw = localStorage.getItem(`comment-draft:company:${companyId}`);
        setDraft(typeof raw === "string" ? raw : "");
      } catch {
        setDraft("");
      }
      return;
    }
    try {
      const key = `comment-draft:company:${companyId}`;
      if (draft.trim()) {
        localStorage.setItem(key, draft);
      } else {
        localStorage.removeItem(key);
      }
    } catch {
      /* quota / private mode */
    }
  }, [companyId, draft]);

  const scheduleHighlight = useCallback((id: string) => {
    setHighlightId(id);
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightId((current) => (current === id ? null : current));
    }, HIGHLIGHT_DURATION_MS);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setTargetCommentId(params.get("commentId"));
  }, []);

  useEffect(() => {
    if (!targetCommentId) return;
    if (hasProcessedDeepLink.current) return;
    if (!ordered.some((c) => c.id === targetCommentId)) return;
    hasProcessedDeepLink.current = true;
    setShowAll(true);
    scheduleHighlight(targetCommentId);
  }, [targetCommentId, ordered, scheduleHighlight]);

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
    onSuccess: (created) => {
      setDraft("");
      setReplyParent(null);
      /** Ensure list + title count update even if refetch is delayed or optimistic row was skipped. */
      queryClient.setQueryData<CommentWithAuthor[]>(queryKey, (old) => {
        const list = old ?? [];
        const withoutTemp = list.filter((c) => !String(c.id).startsWith("optimistic-"));
        const deduped = withoutTemp.filter((c) => c.id !== created.id);
        const merged = [...deduped, created];
        merged.sort((a, b) => {
          const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return ta - tb;
        });
        return merged;
      });
      if (created?.id) {
        scheduleHighlight(created.id);
      }
      toast.success(t("toastCreated"));
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey });
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

  const restoreMutation = useMutation<
    CommentWithAuthor,
    Error,
    { commentId: string; snapshot: CommentWithAuthor },
    { previous: CommentWithAuthor[] | undefined }
  >({
    mutationFn: ({ commentId }) => restoreOwnComment({ commentId }),
    onMutate: async ({ snapshot }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<CommentWithAuthor[]>(queryKey);
      queryClient.setQueryData<CommentWithAuthor[]>(queryKey, (old) => {
        const existing = old ?? [];
        const withoutDup = existing.filter((c) => c.id !== snapshot.id);
        return [...withoutDup, { ...snapshot, deleted_at: null, deleted_by: null }];
      });
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(queryKey, ctx.previous);
      }
      const message = err instanceof Error ? err.message : t("unknownError");
      toast.error(t("toastRestoreFailed"), { description: message });
    },
    onSuccess: (restored) => {
      if (restored?.id) {
        scheduleHighlight(restored.id);
      }
      toast.success(t("toastRestored"));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation<
    { id: string },
    Error,
    string,
    { previous: CommentWithAuthor[] | undefined; deletedComment: CommentWithAuthor | null }
  >({
    mutationFn: (commentId: string) => deleteComment({ commentId }),
    onMutate: async (commentId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<CommentWithAuthor[]>(queryKey);
      const deletedComment = previous?.find((c) => c.id === commentId) ?? null;
      queryClient.setQueryData<CommentWithAuthor[]>(queryKey, (old) =>
        (old ?? []).filter((c) => c.id !== commentId),
      );
      return { previous, deletedComment };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(queryKey, ctx.previous);
      }
      const message = err instanceof Error ? err.message : t("unknownError");
      toast.error(t("toastDeleteFailed"), { description: message });
    },
    onSuccess: (_data, commentId, ctx) => {
      const snapshot = ctx?.deletedComment ?? null;
      if (snapshot && snapshot.created_by === currentUser?.id) {
        toast.success(t("toastDeleted"), {
          action: {
            label: t("toastDeletedUndo"),
            onClick: () => {
              restoreMutation.mutate({ commentId, snapshot });
            },
          },
        });
      } else {
        toast.success(t("toastDeleted"));
      }
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
      requestAnimationFrame(() => {
        composerTextareaRef.current?.focus();
      });
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
    try {
      await createMutation.mutateAsync();
    } catch {
      // Errors are surfaced via createMutation.onError (toast + rollback).
    }
  }, [createMutation]);

  const handleChipTemplate = useCallback((template: string) => {
    setDraft(template);
    setReplyParent(null);
    requestAnimationFrame(() => {
      const el = composerTextareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(template.length, template.length);
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, []);

  const replyBanner =
    replyParent != null
      ? t("replyingTo", { name: replyParent.profiles?.display_name?.trim() || t("anonymousUser") })
      : null;

  const suggestionChips: {
    key: string;
    label: string;
    template: string;
    Icon: IconComponent;
  }[] = [
    {
      key: "call",
      label: t("chipCallSummary"),
      template: t("chipCallSummaryTemplate"),
      Icon: Phone,
    },
    {
      key: "next",
      label: t("chipNextSteps"),
      template: t("chipNextStepsTemplate"),
      Icon: Sparkles,
    },
    {
      key: "objection",
      label: t("chipObjection"),
      template: t("chipObjectionTemplate"),
      Icon: ShieldAlert,
    },
    {
      key: "decision",
      label: t("chipDecisionMaker"),
      template: t("chipDecisionMakerTemplate"),
      Icon: UserCheck,
    },
  ];

  const suggestionChipsList = (listClassName?: string) => (
    <ul
      className={cn("flex flex-wrap justify-center gap-1.5", listClassName)}
      aria-label={t("suggestionsLabel")}
    >
      {suggestionChips.map(({ key, label, template, Icon }) => (
        <li key={key}>
          <button
            type="button"
            onClick={() => handleChipTemplate(template)}
            disabled={!currentUser}
            className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon className="h-3 w-3" aria-hidden />
            {label}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" aria-hidden />
          {t("cardTitle", { count: comments.length })}
        </CardTitle>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{t("cardSubtitle")}</p>
      </CardHeader>
      <CardContent className="space-y-5">
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
            isReplying={replyParent !== null}
            textareaRef={composerTextareaRef}
          />
        </div>

        {!isPending && !isError && ordered.length > 0 ? (
          <div className="rounded-md border border-border/50 bg-muted/15 px-3 py-2.5">
            {suggestionChipsList()}
          </div>
        ) : null}

        {isPending ? (
          <LoadingState count={3} />
        ) : isError ? (
          <p className="text-destructive text-sm" role="alert">
            {t("loadError", { message: error instanceof Error ? error.message : String(error) })}
          </p>
        ) : ordered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
            <MessageSquare className="mx-auto h-6 w-6 text-muted-foreground/70" aria-hidden />
            <h3 className="mt-2 text-sm font-semibold text-foreground">{t("emptyHeading")}</h3>
            <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground sm:text-sm">{t("emptyPrompt")}</p>
            {suggestionChipsList("mt-3")}
          </div>
        ) : (
          <div className="space-y-2.5">
            {hiddenRootsCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAll(true)}
                className="w-full justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                {t("showOlder", { count: hiddenRootsCount })}
              </Button>
            ) : null}
            <ul className="space-y-2.5">
              {visibleOrdered.map((c) => {
                const rawDepth = depthById.get(c.id) ?? 0;
                const visualDepth = Math.min(rawDepth, MAX_VISUAL_DEPTH);
                const parentName = c.parent_id ? nameById.get(c.parent_id) ?? null : null;
                return (
                  <li key={c.id}>
                    <CommentItem
                      comment={c}
                      currentUserId={currentUser?.id ?? null}
                      localeTag={localeTag}
                      depth={visualDepth}
                      parentAuthorName={parentName}
                      isHighlighted={highlightId === c.id}
                      onReply={handleReply}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
