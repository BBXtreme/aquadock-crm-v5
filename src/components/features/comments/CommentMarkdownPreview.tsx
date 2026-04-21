"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

type CommentMarkdownPreviewProps = {
  markdown: string;
  className?: string;
};

const SAFE_URL_SCHEMES = ["http:", "https:", "mailto:", "tel:"] as const;

function safeUrl(url: string): string {
  try {
    const parsed = new URL(url, "http://localhost");
    return SAFE_URL_SCHEMES.includes(parsed.protocol as (typeof SAFE_URL_SCHEMES)[number]) ? url : "";
  } catch {
    return url.startsWith("#") || url.startsWith("/") ? url : "";
  }
}

export function CommentMarkdownPreview({ markdown, className }: CommentMarkdownPreviewProps) {
  if (!markdown.trim()) {
    return <p className="text-muted-foreground text-sm">—</p>;
  }

  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none text-foreground",
        "prose-p:my-2 prose-headings:mt-4 prose-headings:mb-2 prose-ul:my-2 prose-ol:my-2",
        "prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-md",
        "prose-a:underline-offset-2",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={safeUrl}
        components={{
          a: ({ href, children, ...rest }) => (
            <a href={href} rel="noopener noreferrer nofollow" target="_blank" {...rest}>
              {children}
            </a>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
