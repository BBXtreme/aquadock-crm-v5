import { z } from "zod";

import { FEEDBACK_SENTIMENTS, FEEDBACK_TOPIC_IDS } from "@/lib/constants/feedback-options";

const sentimentEnum = z.enum(FEEDBACK_SENTIMENTS);

const emptyStringToNull = (val: unknown) => (val === "" ? null : val);

function isFeedbackTopicId(value: string): boolean {
  for (const id of FEEDBACK_TOPIC_IDS) {
    if (id === value) {
      return true;
    }
  }
  return false;
}

export const feedbackSubmitSchema = z
  .object({
    topic: z
      .string()
      .trim()
      .refine((v) => isFeedbackTopicId(v), { message: "Select a topic" }),
    body: z.string().trim().min(1, "Body required").max(20_000),
    sentiment: sentimentEnum,
    page_url: z.preprocess(emptyStringToNull, z.string().trim().max(2048).nullable().optional()),
    screenshot_url: z.preprocess(emptyStringToNull, z.string().trim().url().max(4096).nullable().optional()),
    screenshot_path: z.preprocess(emptyStringToNull, z.string().trim().max(1024).nullable().optional()),
  })
  .strict()
  .superRefine((data, ctx) => {
    const url = data.screenshot_url;
    const path = data.screenshot_path;
    const hasUrl = url !== null && url !== undefined;
    const hasPath = path !== null && path !== undefined;
    if (hasUrl !== hasPath) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Screenshot URL and path must both be set or both omitted",
        path: hasUrl ? ["screenshot_path"] : ["screenshot_url"],
      });
    }
  });

export type FeedbackSubmitInput = z.infer<typeof feedbackSubmitSchema>;
