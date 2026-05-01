"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Control } from "react-hook-form";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { submitFeedback } from "@/lib/actions/feedback";
import { FEEDBACK_SENTIMENTS } from "@/lib/constants/feedback-options";
import { useT } from "@/lib/i18n/use-translations";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { type FeedbackSubmitInput, feedbackSubmitSchema } from "@/lib/validations/feedback";

const FEEDBACK_SCREENSHOT_BUCKET = "feedback-screenshots";

/** Tailwind v4 / shadcn tokens use `lab()` / `oklch()`; stock `html2canvas` cannot parse them — `html2canvas-pro` is a compatible fork. */
const HTML2CANVAS_OPTIONS = {
  scale: 1.8,
  useCORS: true,
  logging: false,
} as const;

type FeedbackModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
};

export default function FeedbackModal({ open, onOpenChange, userId }: FeedbackModalProps) {
  const t = useT("feedback");
  const pathname = usePathname();
  const wasOpenRef = useRef(false);
  const [isAttaching, setIsAttaching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const form = useForm<FeedbackSubmitInput>({
    resolver: zodResolver(feedbackSubmitSchema),
    defaultValues: {
      topic: "",
      body: "",
      sentiment: FEEDBACK_SENTIMENTS[0],
      page_url: null,
      screenshot_url: null,
      screenshot_path: null,
    },
  });

  useEffect(() => {
    if (open) {
      if (!wasOpenRef.current) {
        form.reset({
          topic: "",
          body: "",
          sentiment: FEEDBACK_SENTIMENTS[0],
          page_url: pathname,
          screenshot_url: null,
          screenshot_path: null,
        });
        setPreviewUrl(null);
      }
      wasOpenRef.current = true;
    } else {
      wasOpenRef.current = false;
    }
  }, [open, pathname, form]);

  const handleRemoveScreenshot = useCallback(() => {
    form.setValue("screenshot_url", null);
    form.setValue("screenshot_path", null);
    setPreviewUrl(null);
  }, [form]);

  const handleAttachScreenshot = useCallback(async () => {
    setIsAttaching(true);
    try {
      const { default: html2canvas } = await import("html2canvas-pro");
      // Prefer `<main>` so we capture the app shell content, not unrelated DOM outside the layout.
      // Fallback to `document.body` when no `<main>` exists (edge layouts / tests).
      const mainEl = document.querySelector("main");
      const target = mainEl instanceof HTMLElement ? mainEl : document.body;
      const canvas = await html2canvas(target, HTML2CANVAS_OPTIONS);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b !== null) {
            resolve(b);
            return;
          }
          reject(new Error("toBlob failed"));
        }, "image/png");
      });

      const supabase = createClient();
      const objectPath = `${userId}/${crypto.randomUUID()}.png`;
      const { error: uploadError } = await supabase.storage
        .from(FEEDBACK_SCREENSHOT_BUCKET)
        .upload(objectPath, blob, { contentType: "image/png", upsert: false });

      if (uploadError !== null) {
        toast.error(t("uploadError"), { description: uploadError.message });
        return;
      }

      const { data: pub } = supabase.storage.from(FEEDBACK_SCREENSHOT_BUCKET).getPublicUrl(objectPath);
      const publicUrl = pub.publicUrl;
      form.setValue("screenshot_path", objectPath);
      form.setValue("screenshot_url", publicUrl);
      setPreviewUrl(publicUrl);
    } catch (e) {
      const message = e instanceof Error ? e.message : t("captureError");
      toast.error(t("captureError"), { description: message });
    } finally {
      setIsAttaching(false);
    }
  }, [form, t, userId]);

  const onSubmit = useCallback(
    async (values: FeedbackSubmitInput) => {
      setIsSubmitting(true);
      try {
        const result = await submitFeedback(values);
        if (result.ok) {
          toast.success(t("thankYouToast"));
          onOpenChange(false);
          return;
        }
        toast.error(t("submitError"), { description: result.error });
      } finally {
        setIsSubmitting(false);
      }
    },
    [onOpenChange, t],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-4 border-border bg-background p-5 sm:rounded-xl">
        <DialogHeader className="gap-1 text-left">
          <DialogTitle className="font-semibold text-base tracking-tight">{t("title")}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control as Control<FeedbackSubmitInput>}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-xs">{t("topicLabel")}</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value === "" ? undefined : field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="h-10 w-full rounded-md border-border bg-muted/20">
                        <SelectValue placeholder={t("topicPlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="general">{t("topics.general")}</SelectItem>
                      <SelectItem value="bug">{t("topics.bug")}</SelectItem>
                      <SelectItem value="feature">{t("topics.feature")}</SelectItem>
                      <SelectItem value="ux">{t("topics.ux")}</SelectItem>
                      <SelectItem value="openmap">{t("topics.openmap")}</SelectItem>
                      <SelectItem value="email">{t("topics.email")}</SelectItem>
                      <SelectItem value="ai">{t("topics.ai")}</SelectItem>
                      <SelectItem value="other">{t("topics.other")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as Control<FeedbackSubmitInput>}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="sr-only">{t("bodyLabel")}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={8}
                      placeholder={t("bodyPlaceholder")}
                      className="min-h-[180px] resize-y rounded-md border-border bg-muted/10 text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-md border-border"
                disabled={isAttaching}
                onClick={() => {
                  void handleAttachScreenshot();
                }}
              >
                {isAttaching ? t("attaching") : t("attachScreenshot")}
              </Button>
              {previewUrl !== null ? (
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/10 p-1.5">
                  <Image
                    src={previewUrl}
                    alt=""
                    width={80}
                    height={48}
                    className="h-12 w-20 rounded object-cover"
                    unoptimized
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={handleRemoveScreenshot}>
                    {t("removeScreenshot")}
                  </Button>
                </div>
              ) : null}
            </div>

            <FormField
              control={form.control as Control<FeedbackSubmitInput>}
              name="sentiment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="sr-only">{t("sentimentLabel")}</FormLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {FEEDBACK_SENTIMENTS.map((emo) => (
                      <Button
                        key={emo}
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-10 w-10 rounded-full border text-lg transition-colors",
                          field.value === emo
                            ? "border-foreground/30 bg-muted ring-2 ring-ring/40"
                            : "border-transparent bg-muted/30 hover:bg-muted/50",
                        )}
                        aria-pressed={field.value === emo}
                        aria-label={`${t("sentimentLabel")}: ${emo}`}
                        onClick={() => {
                          field.onChange(emo);
                        }}
                      >
                        {emo}
                      </Button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-1 justify-end">
              <Button
                type="submit"
                className="rounded-md bg-foreground text-background hover:bg-foreground/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? t("sending") : t("send")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
