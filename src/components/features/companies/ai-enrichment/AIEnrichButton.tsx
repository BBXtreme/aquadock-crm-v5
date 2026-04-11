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

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn(className)}
      onClick={onClick}
      disabled={disabled || pending}
      aria-busy={pending ? true : undefined}
      title={t("aiEnrich.buttonTitleWithShortcut", { shortcut: shortcutLabel })}
    >
      <Sparkles className="mr-2 h-4 w-4" />
      <span className="inline-flex items-center gap-2">
        {pending ? t("aiEnrich.researching") : t("aiEnrich.button")}
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:inline-flex">
          {shortcutLabel}
        </kbd>
      </span>
    </Button>
  );
}
