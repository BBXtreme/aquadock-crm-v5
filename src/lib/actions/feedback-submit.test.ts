import { beforeEach, describe, expect, it, vi } from "vitest";

import { silenceHandleSupabaseErrorConsole } from "@/test/silence-handle-supabase-error-console";

const requireUser = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/require-user", () => ({
  requireUser,
}));

const createServerSupabaseClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient,
}));

const USER_ID = "10000000-0000-4000-8000-000000000001";

const validPayload = {
  topic: "general",
  body: "Hello",
  sentiment: "😊" as const,
};

describe("submitFeedback", () => {
  silenceHandleSupabaseErrorConsole();

  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ id: USER_ID });
  });

  it("returns ok false with message when validation fails", async () => {
    const { submitFeedback } = await import("@/lib/actions/feedback");
    const out = await submitFeedback({ topic: "not-a-topic", body: "x", sentiment: "😊" });
    expect(out).toEqual({ ok: false, error: "Select a topic" });
  });

  it("returns ok false when insert fails", async () => {
    createServerSupabaseClient.mockResolvedValue({
      from: vi.fn(() => ({
        insert: vi.fn().mockResolvedValue({ error: { message: "rls" } }),
      })),
    } as never);

    const { submitFeedback } = await import("@/lib/actions/feedback");
    const out = await submitFeedback(validPayload);
    expect(out).toEqual({ ok: false, error: "Database error: rls" });
  });

  it("returns ok true on successful insert", async () => {
    createServerSupabaseClient.mockResolvedValue({
      from: vi.fn(() => ({
        insert: vi.fn().mockResolvedValue({ error: null }),
      })),
    } as never);

    const { submitFeedback } = await import("@/lib/actions/feedback");
    await expect(submitFeedback(validPayload)).resolves.toEqual({ ok: true });
  });
});
