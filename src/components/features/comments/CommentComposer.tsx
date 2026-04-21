"use client";

import {
  Bold,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  ListTodo,
  SquareCode,
} from "lucide-react";
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRef, useState } from "react";

import { CommentMarkdownPreview } from "@/components/features/comments/CommentMarkdownPreview";
import { applyMarkdownSnippet } from "@/components/features/comments/comment-composer-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n/use-translations";
import { cn } from "@/lib/utils";

type Snippet = Parameters<typeof applyMarkdownSnippet>[3];

type CommentComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void | Promise<void>;
  isSubmitting?: boolean;
  disabled?: boolean;
  title?: string;
  replyBanner?: string | null;
  onCancelReply?: () => void;
  isReplying?: boolean;
};

export function CommentComposer({
  value,
  onChange,
  onSubmit,
  isSubmitting = false,
  disabled = false,
  title,
  replyBanner,
  onCancelReply,
  isReplying = false,
}: CommentComposerProps) {
  const t = useT("comments");
  const ta = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const hasContent = value.trim().length > 0;
  const isExpanded = isFocused || hasContent;
  const canSubmit = hasContent && !isSubmitting && !disabled;
  const submitLabel = isReplying ? t("submitReply") : t("submit");

  const applySnippet = (snippet: Snippet) => {
    const el = ta.current;
    if (!el) {
      return;
    }
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const { next, focusStart, focusEnd } = applyMarkdownSnippet(value, start, end, snippet);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(focusStart, focusEnd);
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      return;
    }
    await onSubmit();
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSubmit) {
      e.preventDefault();
      void onSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {replyBanner ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
          <span className="text-foreground/80">{replyBanner}</span>
          {onCancelReply ? (
            <Button type="button" variant="ghost" size="sm" onClick={onCancelReply} className="h-7">
              {t("cancelReply")}
            </Button>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "rounded-lg border bg-card shadow-sm transition-colors",
          isExpanded ? "border-ring/60 shadow" : "border-border",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-end gap-0.5 border-b px-2 transition-all",
            isExpanded ? "border-border py-1.5 opacity-100" : "h-0 border-transparent py-0 opacity-0",
            "overflow-hidden",
          )}
          aria-hidden={!isExpanded}
        >
          <ToolbarIconButton label={t("toolHeading")} onClick={() => applySnippet("h2")} tabIndex={isExpanded ? 0 : -1}>
            <Heading2 className="h-4 w-4" />
          </ToolbarIconButton>
          <ToolbarIconButton label={t("toolBold")} onClick={() => applySnippet("bold")} tabIndex={isExpanded ? 0 : -1}>
            <Bold className="h-4 w-4" />
          </ToolbarIconButton>
          <ToolbarIconButton label={t("toolItalic")} onClick={() => applySnippet("italic")} tabIndex={isExpanded ? 0 : -1}>
            <Italic className="h-4 w-4" />
          </ToolbarIconButton>
          <ToolbarIconButton label={t("toolCode")} onClick={() => applySnippet("code")} tabIndex={isExpanded ? 0 : -1}>
            <SquareCode className="h-4 w-4" />
          </ToolbarIconButton>
          <ToolbarIconButton label={t("toolLink")} onClick={() => applySnippet("link")} tabIndex={isExpanded ? 0 : -1}>
            <Link2 className="h-4 w-4" />
          </ToolbarIconButton>
          <ToolbarIconButton label={t("toolBullet")} onClick={() => applySnippet("bullet")} tabIndex={isExpanded ? 0 : -1}>
            <List className="h-4 w-4" />
          </ToolbarIconButton>
          <ToolbarIconButton label={t("toolOrdered")} onClick={() => applySnippet("ordered")} tabIndex={isExpanded ? 0 : -1}>
            <ListOrdered className="h-4 w-4" />
          </ToolbarIconButton>
          <ToolbarIconButton label={t("toolTask")} onClick={() => applySnippet("task")} tabIndex={isExpanded ? 0 : -1}>
            <ListTodo className="h-4 w-4" />
          </ToolbarIconButton>
        </div>

        <div className="px-3 py-2">
          <Textarea
            ref={ta}
            data-testid="company-comment-composer-body"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={t("placeholder")}
            disabled={disabled || isSubmitting}
            rows={isExpanded ? 5 : 2}
            aria-label={title ?? t("addTitle")}
            className={cn(
              "resize-y border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0",
              isExpanded ? "min-h-[120px]" : "min-h-[56px]",
            )}
          />
        </div>

        {hasContent && showPreview ? (
          <div className="border-t border-dashed border-border bg-muted/30 px-3 py-2">
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("tabPreview")}
            </div>
            <CommentMarkdownPreview markdown={value} />
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2 text-xs text-muted-foreground">
          <span className="truncate">{t("markdownSupported")}</span>
          <div className="flex items-center gap-1">
            {hasContent ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowPreview((v) => !v)}
                aria-pressed={showPreview}
              >
                {t("tabPreview")}
              </Button>
            ) : null}
            <Button type="submit" size="sm" disabled={!canSubmit} className="h-8">
              {isSubmitting ? t("submitting") : submitLabel}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

function ToolbarIconButton({
  label,
  onClick,
  tabIndex,
  children,
}: {
  label: string;
  onClick: () => void;
  tabIndex?: number;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-muted-foreground hover:text-foreground"
      onClick={onClick}
      aria-label={label}
      title={label}
      tabIndex={tabIndex}
    >
      {children}
    </Button>
  );
}
