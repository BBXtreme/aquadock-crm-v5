"use client";

import { MessageSquarePlus } from "lucide-react";
import { useState } from "react";

import FeedbackModal from "@/components/features/feedback/FeedbackModal";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/use-translations";

type FeedbackButtonProps = {
  userId: string;
};

export default function FeedbackButton({ userId }: FeedbackButtonProps) {
  const t = useT("feedback");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1.5 px-2 text-muted-foreground hover:text-foreground"
        onClick={() => {
          setOpen(true);
        }}
        aria-label={t("triggerAriaLabel")}
      >
        <span className="hidden sm:inline">{t("triggerLabel")}</span>
        <MessageSquarePlus className="h-4 w-4 shrink-0" aria-hidden />
      </Button>
      <FeedbackModal open={open} onOpenChange={setOpen} userId={userId} />
    </>
  );
}
