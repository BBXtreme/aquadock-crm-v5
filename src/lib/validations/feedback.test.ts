import { describe, expect, it } from "vitest";

import { FEEDBACK_SENTIMENTS, FEEDBACK_TOPIC_IDS } from "@/lib/constants/feedback-options";
import { feedbackSubmitSchema } from "@/lib/validations/feedback";

const validBase = {
  topic: "general",
  body: "The export dialog should remember the last folder.",
  sentiment: FEEDBACK_SENTIMENTS[0],
  page_url: "/companies",
  screenshot_url: null,
  screenshot_path: null,
} as const;

describe("feedbackSubmitSchema", () => {
  it("accepts a minimal valid payload without screenshot", () => {
    const out = feedbackSubmitSchema.parse({
      topic: "bug",
      body: "  trimmed  ",
      sentiment: "😐",
      page_url: null,
      screenshot_url: null,
      screenshot_path: null,
    });
    expect(out.body).toBe("trimmed");
    expect(out.topic).toBe("bug");
    expect(out.sentiment).toBe("😐");
  });

  it("rejects empty topic", () => {
    const r = feedbackSubmitSchema.safeParse({ ...validBase, topic: "" });
    expect(r.success).toBe(false);
  });

  it("rejects unknown topic id", () => {
    const r = feedbackSubmitSchema.safeParse({ ...validBase, topic: "not-a-topic" });
    expect(r.success).toBe(false);
  });

  it("accepts every SQL-aligned topic id", () => {
    for (const topic of FEEDBACK_TOPIC_IDS) {
      const out = feedbackSubmitSchema.parse({ ...validBase, topic });
      expect(out.topic).toBe(topic);
    }
  });

  it("rejects empty body", () => {
    const r = feedbackSubmitSchema.safeParse({ ...validBase, body: "   " });
    expect(r.success).toBe(false);
  });

  it("rejects invalid sentiment emoji", () => {
    const r = feedbackSubmitSchema.safeParse({ ...validBase, sentiment: "💀" });
    expect(r.success).toBe(false);
  });

  it("rejects screenshot_url without screenshot_path", () => {
    const r = feedbackSubmitSchema.safeParse({
      ...validBase,
      screenshot_url: "https://example.com/x.png",
      screenshot_path: null,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path.join("."));
      expect(paths.some((p) => p.includes("screenshot_path"))).toBe(true);
    }
  });

  it("rejects screenshot_path without screenshot_url", () => {
    const r = feedbackSubmitSchema.safeParse({
      ...validBase,
      screenshot_url: null,
      screenshot_path: "user-id/file.png",
    });
    expect(r.success).toBe(false);
  });

  it("accepts paired screenshot_url and screenshot_path with a valid URL", () => {
    const out = feedbackSubmitSchema.parse({
      ...validBase,
      screenshot_url: "https://example.com/storage/v1/object/public/feedback-screenshots/u/f.png",
      screenshot_path: "user-id/11111111-1111-1111-1111-111111111111.png",
    });
    expect(out.screenshot_url).toContain("https://");
    expect(out.screenshot_path).toContain("user-id");
  });

  it("maps empty string page_url to null via preprocess", () => {
    const out = feedbackSubmitSchema.parse({ ...validBase, page_url: "" });
    expect(out.page_url === null || out.page_url === undefined).toBe(true);
  });

  it("rejects strict extra keys", () => {
    const r = feedbackSubmitSchema.safeParse({ ...validBase, user_id: "123e4567-e89b-12d3-a456-426614174000" });
    expect(r.success).toBe(false);
  });
});
