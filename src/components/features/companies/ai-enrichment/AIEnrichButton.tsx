"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/use-translations";
import { cn } from "@/lib/utils";

type Props = {
  onClick: () => void;
  disabled?: boolean;
  pending?: boolean;
  className?: string;
};

export function AIEnrichButton({ onClick, disabled, pending, className }: Props) {
  const t = useT("companies");
  const [shortcutLabel, setShortcutLabel] = useState("Ctrl+E");

  useEffect(() => {
    if (typeof navigator === "undefined") {
      return;
    }
    if (/Mac|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      setShortcutLabel("⌘E");
    }
  }, []);

  const title = t("aiEnrich.buttonTitleWithShortcut", { shortcut: shortcutLabel });
  const ariaLabel = pending ? t("aiEnrich.researching") : title;

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      className={cn(className)}
      onClick={onClick}
      disabled={disabled || pending}
      aria-busy={pending ? true : undefined}
      aria-keyshortcuts="Meta+E Control+E"
      aria-label={ariaLabel}
      title={title}
    >
      <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
    </Button>
  );
}
