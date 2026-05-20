import { beforeEach, describe, expect, it, vi } from "vitest";
import { silenceHandleSupabaseErrorConsole } from "@/test/silence-handle-supabase-error-console";

const requireAdmin = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin,
}));

vi.mock("@/lib/auth/require-user", () => ({
  requireUser: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

const createAdminClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient,
}));

const createInAppNotification = vi.hoisted(() => vi.fn());
vi.mock("@/lib/services/in-app-notifications", () => ({
  createInAppNotification,
}));

describe("feedback admin actions", () => {
  silenceHandleSupabaseErrorConsole();

  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ id: "a0000000-0000-4000-8000-000000000099" });
    createInAppNotification.mockResolvedValue({ id: "n1" } as never);
  });

  describe("listAdminFeedbackRows", () => {
    it("returns rows with authorDisplay from profiles", async () => {
      const order = vi.fn().mockResolvedValue({
        data: [
          {
            id: "f1",
            user_id: "u1",
            topic: "general",
            body: "hello",
            sentiment: "😊",
            page_url: null,
            screenshot_url: null,
            screenshot_path: null,
            created_at: "2026-01-01T00:00:00Z",
          },
        ],
        error: null,
      });
      const feedbackSelect = vi.fn(() => ({ order }));

      const inProfiles = vi.fn().mockResolvedValue({
        data: [{ id: "u1", display_name: "  Ada  " }],
        error: null,
      });
      const profilesSelect = vi.fn(() => ({ in: inProfiles }));

      createAdminClient.mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === "feedback") return { select: feedbackSelect };
          return { select: profilesSelect };
        }),
      } as never);

      const { listAdminFeedbackRows } = await import("@/lib/actions/feedback");
      const rows = await listAdminFeedbackRows();
      expect(rows).toHaveLength(1);
      expect(rows[0]?.authorDisplay).toBe("Ada");
    });

    it("uses empty authorDisplay when profile name missing", async () => {
      const order = vi.fn().mockResolvedValue({
        data: [{ id: "f1", user_id: "u1", topic: "general", body: "a", sentiment: "😊" }],
        error: null,
      });
      const feedbackSelect = vi.fn(() => ({ order }));

      const inProfiles = vi.fn().mockResolvedValue({
        data: [{ id: "u1", display_name: "   " }],
        error: null,
      });
      const profilesSelect = vi.fn(() => ({ in: inProfiles }));

      createAdminClient.mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === "feedback") return { select: feedbackSelect };
          return { select: profilesSelect };
        }),
      } as never);

      const { listAdminFeedbackRows } = await import("@/lib/actions/feedback");
      const rows = await listAdminFeedbackRows();
      expect(rows[0]?.authorDisplay).toBe("");
    });
  });

  describe("deleteAdminFeedbackRow", () => {
    it("throws on invalid id", async () => {
      const { deleteAdminFeedbackRow } = await import("@/lib/actions/feedback");
      await expect(deleteAdminFeedbackRow("not-uuid")).rejects.toThrow("Invalid feedback id");
    });

    it("throws when row not found", async () => {
      const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const selectEq = vi.fn(() => ({ maybeSingle }));
      const select = vi.fn(() => ({ eq: selectEq }));
      createAdminClient.mockReturnValue({ from: vi.fn(() => ({ select })) } as never);

      const { deleteAdminFeedbackRow } = await import("@/lib/actions/feedback");
      await expect(deleteAdminFeedbackRow("10000000-0000-4000-8000-000000000001")).rejects.toThrow(
        "Feedback not found",
      );
    });

    it("deletes row and skips storage when no screenshot path", async () => {
      const deleteEq = vi.fn().mockResolvedValue({ error: null });
      const deleteOp = vi.fn(() => ({ eq: deleteEq }));
      const maybeSingle = vi.fn().mockResolvedValue({
        data: { id: "f1", screenshot_path: null },
        error: null,
      });
      const selectEq = vi.fn(() => ({ maybeSingle }));
      const select = vi.fn(() => ({ eq: selectEq }));
      const remove = vi.fn();
      const fromStorage = vi.fn(() => ({ remove }));

      let feedbackFromCalls = 0;
      createAdminClient.mockReturnValue({
        from: vi.fn(() => {
          feedbackFromCalls += 1;
          if (feedbackFromCalls === 1) return { select };
          return { delete: deleteOp };
        }),
        storage: { from: fromStorage },
      } as never);

      const id = "10000000-0000-4000-8000-000000000001";
      const { deleteAdminFeedbackRow } = await import("@/lib/actions/feedback");
      await deleteAdminFeedbackRow(id);
      expect(remove).not.toHaveBeenCalled();
      expect(deleteEq).toHaveBeenCalled();
    });

    it("removes storage object when screenshot_path present", async () => {
      const path = "u/shot.png";
      const deleteEq = vi.fn().mockResolvedValue({ error: null });
      const deleteOp = vi.fn(() => ({ eq: deleteEq }));
      const maybeSingle = vi.fn().mockResolvedValue({
        data: { id: "f1", screenshot_path: path },
        error: null,
      });
      const selectEq = vi.fn(() => ({ maybeSingle }));
      const select = vi.fn(() => ({ eq: selectEq }));
      const remove = vi.fn().mockResolvedValue({ error: null });
      const fromStorage = vi.fn(() => ({ remove }));

      let feedbackFromCalls = 0;
      createAdminClient.mockReturnValue({
        from: vi.fn(() => {
          feedbackFromCalls += 1;
          if (feedbackFromCalls === 1) return { select };
          return { delete: deleteOp };
        }),
        storage: { from: fromStorage },
      } as never);

      const id = "10000000-0000-4000-8000-000000000001";
      const { deleteAdminFeedbackRow } = await import("@/lib/actions/feedback");
      await deleteAdminFeedbackRow(id);
      expect(fromStorage).toHaveBeenCalledWith("feedback-screenshots");
      expect(remove).toHaveBeenCalledWith([path]);
    });
  });

  describe("updateAdminFeedbackRow", () => {
    const id = "10000000-0000-4000-8000-000000000001";

    it("throws on invalid id", async () => {
      const { updateAdminFeedbackRow } = await import("@/lib/actions/feedback");
      await expect(updateAdminFeedbackRow("bad", { topic: "x" })).rejects.toThrow("Invalid feedback id");
    });

    it("returns early when no non-empty updates", async () => {
      const updateEq = vi.fn();
      const update = vi.fn(() => ({ eq: updateEq }));
      createAdminClient.mockReturnValue({ from: vi.fn(() => ({ update })) } as never);

      const { updateAdminFeedbackRow } = await import("@/lib/actions/feedback");
      await updateAdminFeedbackRow(id, { topic: "   ", body: "", sentiment: "" });
      expect(update).not.toHaveBeenCalled();
    });

    it("updates trimmed topic and body fields", async () => {
      const updateEq = vi.fn().mockResolvedValue({ error: null });
      const update = vi.fn(() => ({ eq: updateEq }));
      createAdminClient.mockReturnValue({ from: vi.fn(() => ({ update })) } as never);

      const { updateAdminFeedbackRow } = await import("@/lib/actions/feedback");
      await updateAdminFeedbackRow(id, { topic: "  Bug  ", body: "  Details  " });
      expect(update).toHaveBeenCalledWith({ topic: "Bug", body: "Details" });
      expect(updateEq).toHaveBeenCalledWith("id", id);
    });

    it("throws when Supabase update fails", async () => {
      const updateEq = vi.fn().mockResolvedValue({ error: { message: "db" } });
      const update = vi.fn(() => ({ eq: updateEq }));
      createAdminClient.mockReturnValue({ from: vi.fn(() => ({ update })) } as never);

      const { updateAdminFeedbackRow } = await import("@/lib/actions/feedback");
      await expect(updateAdminFeedbackRow(id, { sentiment: "😐" })).rejects.toThrow(/Database error/);
    });
  });

  describe("answerAdminFeedbackRow", () => {
    const id = "10000000-0000-4000-8000-000000000001";
    const authorId = "20000000-0000-4000-8000-000000000002";

    it("throws on invalid id", async () => {
      const { answerAdminFeedbackRow } = await import("@/lib/actions/feedback");
      await expect(answerAdminFeedbackRow("nope", "hi")).rejects.toThrow("Invalid feedback id");
    });

    it("throws when answer is empty", async () => {
      const { answerAdminFeedbackRow } = await import("@/lib/actions/feedback");
      await expect(answerAdminFeedbackRow(id, "   ")).rejects.toThrow("Answer cannot be empty");
    });

    it("throws when feedback row not found", async () => {
      const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const selectEq = vi.fn(() => ({ maybeSingle }));
      const select = vi.fn(() => ({ eq: selectEq }));
      createAdminClient.mockReturnValue({ from: vi.fn(() => ({ select })) } as never);

      const { answerAdminFeedbackRow } = await import("@/lib/actions/feedback");
      await expect(answerAdminFeedbackRow(id, "Thanks")).rejects.toThrow("Feedback not found");
    });

    it("appends admin answer and notifies the author", async () => {
      const updateEq = vi.fn().mockResolvedValue({ error: null });
      const update = vi.fn(() => ({ eq: updateEq }));
      const maybeSingle = vi.fn().mockResolvedValue({
        data: { id, body: "Original", user_id: authorId },
        error: null,
      });
      const selectEq = vi.fn(() => ({ maybeSingle }));
      const select = vi.fn(() => ({ eq: selectEq }));

      let feedbackFromCalls = 0;
      createAdminClient.mockReturnValue({
        from: vi.fn(() => {
          feedbackFromCalls += 1;
          if (feedbackFromCalls === 1) return { select };
          return { update };
        }),
      } as never);

      const { answerAdminFeedbackRow } = await import("@/lib/actions/feedback");
      await answerAdminFeedbackRow(id, "We fixed it");

      expect(update).toHaveBeenCalledWith({
        body: "Original\n\n— Admin answer —\nWe fixed it",
      });
      expect(createInAppNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "feedback_answered",
          userId: authorId,
          dedupeKey: `feedback_answered:${id}`,
        }),
      );
    });

    it("truncates long answers in notification body", async () => {
      const longAnswer = "x".repeat(200);
      const updateEq = vi.fn().mockResolvedValue({ error: null });
      const update = vi.fn(() => ({ eq: updateEq }));
      const maybeSingle = vi.fn().mockResolvedValue({
        data: { id, body: "Q", user_id: authorId },
        error: null,
      });
      const selectEq = vi.fn(() => ({ maybeSingle }));
      const select = vi.fn(() => ({ eq: selectEq }));

      let feedbackFromCalls = 0;
      createAdminClient.mockReturnValue({
        from: vi.fn(() => {
          feedbackFromCalls += 1;
          if (feedbackFromCalls === 1) return { select };
          return { update };
        }),
      } as never);

      const { answerAdminFeedbackRow } = await import("@/lib/actions/feedback");
      await answerAdminFeedbackRow(id, longAnswer);

      expect(createInAppNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          body: `${longAnswer.slice(0, 177)}...`,
        }),
      );
    });

    it("still succeeds when notification creation fails", async () => {
      const updateEq = vi.fn().mockResolvedValue({ error: null });
      const update = vi.fn(() => ({ eq: updateEq }));
      const maybeSingle = vi.fn().mockResolvedValue({
        data: { id, body: "Q", user_id: authorId },
        error: null,
      });
      const selectEq = vi.fn(() => ({ maybeSingle }));
      const select = vi.fn(() => ({ eq: selectEq }));

      let feedbackFromCalls = 0;
      createAdminClient.mockReturnValue({
        from: vi.fn(() => {
          feedbackFromCalls += 1;
          if (feedbackFromCalls === 1) return { select };
          return { update };
        }),
      } as never);

      createInAppNotification.mockRejectedValue(new Error("notify down"));
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

      const { answerAdminFeedbackRow } = await import("@/lib/actions/feedback");
      await expect(answerAdminFeedbackRow(id, "OK")).resolves.toBeUndefined();
      expect(updateEq).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });
});
