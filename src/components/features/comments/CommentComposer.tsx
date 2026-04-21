"use client";

import {
  Bold,
  Heading2,
  ImageIcon,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
}: CommentComposerProps) {
  const t = useT("comments");
  const ta = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");

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

  const canSubmit = value.trim().length > 0 && !isSubmitting && !disabled;

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
    <form onSubmit={handleSubmit} className="space-y-3">
      {title ? <h3 className="text-sm font-semibold text-foreground">{title}</h3> : null}
      {replyBanner ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
          <span className="text-muted-foreground">{replyBanner}</span>
          {onCancelReply ? (
            <Button type="button" variant="ghost" size="sm" onClick={onCancelReply}>
              {t("cancelReply")}
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-lg border border-border bg-card shadow-sm">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "write" | "preview")} className="gap-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-2 py-1.5">
            <TabsList variant="line" className="h-auto gap-0 bg-transparent p-0">
              <TabsTrigger value="write" className="text-xs sm:text-sm">
                {t("tabWrite")}
              </TabsTrigger>
              <TabsTrigger value="preview" className="text-xs sm:text-sm">
                {t("tabPreview")}
              </TabsTrigger>
            </TabsList>
            {tab === "write" ? (
              <div className="flex flex-wrap items-center gap-0.5">
                <ToolbarIconButton label={t("toolHeading")} onClick={() => applySnippet("h2")}>
                  <Heading2 className="h-4 w-4" />
                </ToolbarIconButton>
                <ToolbarIconButton label={t("toolBold")} onClick={() => applySnippet("bold")}>
                  <Bold className="h-4 w-4" />
                </ToolbarIconButton>
                <ToolbarIconButton label={t("toolItalic")} onClick={() => applySnippet("italic")}>
                  <Italic className="h-4 w-4" />
                </ToolbarIconButton>
                <ToolbarIconButton label={t("toolCode")} onClick={() => applySnippet("code")}>
                  <SquareCode className="h-4 w-4" />
                </ToolbarIconButton>
                <ToolbarIconButton label={t("toolLink")} onClick={() => applySnippet("link")}>
                  <Link2 className="h-4 w-4" />
                </ToolbarIconButton>
                <ToolbarIconButton label={t("toolBullet")} onClick={() => applySnippet("bullet")}>
                  <List className="h-4 w-4" />
                </ToolbarIconButton>
                <ToolbarIconButton label={t("toolOrdered")} onClick={() => applySnippet("ordered")}>
                  <ListOrdered className="h-4 w-4" />
                </ToolbarIconButton>
                <ToolbarIconButton label={t("toolTask")} onClick={() => applySnippet("task")}>
                  <ListTodo className="h-4 w-4" />
                </ToolbarIconButton>
              </div>
            ) : null}
          </div>

          {/* One editor instance only (Radix keeps inactive TabsContent in DOM). */}
          {tab === "write" ? (
            <div className="px-3 pb-2 pt-2">
              <Textarea
                ref={ta}
                data-testid="company-comment-composer-body"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("placeholder")}
                disabled={disabled || isSubmitting}
                rows={8}
                aria-label={title ?? t("addTitle")}
                className={cn(
                  "min-h-[180px] resize-y border-0 bg-transparent px-0 shadow-none focus-visible:ring-0",
                  "text-sm",
                )}
              />
            </div>
          ) : (
            <div className="min-h-[180px] px-3 pb-3 pt-2">
              <CommentMarkdownPreview markdown={value} />
            </div>
          )}
        </Tabs>

        <div className="flex flex-col gap-2 border-t border-border px-3 py-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>{t("markdownSupported")}</span>
          <span className="inline-flex items-center gap-1.5 opacity-80">
            <ImageIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {t("filesHintLater")}
          </span>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={!canSubmit}>
          {isSubmitting ? t("submitting") : t("submit")}
        </Button>
      </div>
    </form>
  );
}

function ToolbarIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-foreground"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </Button>
  );
}
