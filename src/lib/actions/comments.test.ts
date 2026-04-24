import { beforeEach, describe, expect, it, vi } from "vitest";
import { silenceHandleSupabaseErrorConsole } from "@/test/silence-handle-supabase-error-console";
import {
  createCompanyComment,
  deleteComment,
  listCompanyComments,
  restoreOwnComment,
  updateComment,
} from "./comments";

const createInAppNotificationMock = vi.hoisted(() => vi.fn().mockResolvedValue(null));
const getUser = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/services/in-app-notifications", () => ({
  createInAppNotification: (...args: unknown[]) => createInAppNotificationMock(...args),
}));

vi.mock("@/lib/auth/get-current-user", () => ({
  getCurrentUser: () => getUser(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    from: (...args: unknown[]) => fromMock(...args),
    auth: { getUser: async () => ({ data: { user: null } }) },
  })),
}));

describe("comments server actions", () => {
  silenceHandleSupabaseErrorConsole();

  beforeEach(() => {
    getUser.mockReset();
    fromMock.mockReset();
    createInAppNotificationMock.mockReset();
    createInAppNotificationMock.mockResolvedValue(null);
  });

  it("listCompanyComments throws when unauthenticated", async () => {
    getUser.mockResolvedValue(null);
    await expect(listCompanyComments("00000000-0000-4000-8000-000000000001")).rejects.toThrow("Unauthorized");
  });

  it("listCompanyComments returns rows", async () => {
    getUser.mockResolvedValue({ id: "u1" });
    const rows = [{ id: "c1", body_markdown: "hi" }];
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: rows, error: null }),
    });
    await expect(listCompanyComments("00000000-0000-4000-8000-000000000001")).resolves.toEqual(rows);
  });

  it("listCompanyComments throws on Supabase error", async () => {
    getUser.mockResolvedValue({ id: "u1" });
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: "db" } }),
    });
    await expect(listCompanyComments("00000000-0000-4000-8000-000000000001")).rejects.toThrow("Database error");
  });

  it("createCompanyComment inserts and returns row", async () => {
    getUser.mockResolvedValue({ id: "u1" });
    const row = { id: "c1", body_markdown: "x" };
    const single = vi.fn().mockResolvedValue({ data: row, error: null });
    fromMock.mockReturnValue({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({ single })),
      })),
    });
    await expect(
      createCompanyComment({
        companyId: "00000000-0000-4000-8000-000000000001",
        bodyMarkdown: "x",
      }),
    ).resolves.toEqual(row);
  });

  it("createCompanyComment validates empty body", async () => {
    getUser.mockResolvedValue({ id: "u1" });
    await expect(
      createCompanyComment({
        companyId: "00000000-0000-4000-8000-000000000001",
        bodyMarkdown: "   ",
      }),
    ).rejects.toThrow();
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("createCompanyComment notifies parent author when replying to another user", async () => {
    getUser.mockResolvedValue({ id: "actor-1" });
    const companyId = "00000000-0000-4000-8000-000000000001";
    const parentId = "00000000-0000-4000-8000-000000000002";
    const newRow = { id: "c-reply", body_markdown: "child" };
    const insertSingle = vi.fn().mockResolvedValue({ data: newRow, error: null });
    const insertChain = {
      insert: vi.fn(() => ({
        select: vi.fn(() => ({ single: insertSingle })),
      })),
    };
    const parentChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { created_by: "parent-user" }, error: null }),
    };
    fromMock.mockReturnValueOnce(insertChain).mockReturnValueOnce(parentChain);

    await expect(
      createCompanyComment({
        companyId,
        bodyMarkdown: "child",
        parentId,
      }),
    ).resolves.toEqual(newRow);

    expect(createInAppNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "comment_reply",
        userId: "parent-user",
        dedupeKey: "comment_reply:c-reply",
      }),
    );
  });

  it("createCompanyComment skips notification when parent lookup errors", async () => {
    getUser.mockResolvedValue({ id: "actor-1" });
    const insertSingle = vi.fn().mockResolvedValue({ data: { id: "c2", body_markdown: "c" }, error: null });
    const insertChain = {
      insert: vi.fn(() => ({
        select: vi.fn(() => ({ single: insertSingle })),
      })),
    };
    const parentChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: "missing" } }),
    };
    fromMock.mockReturnValueOnce(insertChain).mockReturnValueOnce(parentChain);

    await createCompanyComment({
      companyId: "00000000-0000-4000-8000-000000000001",
      bodyMarkdown: "c",
      parentId: "00000000-0000-4000-8000-000000000003",
    });

    expect(createInAppNotificationMock).not.toHaveBeenCalled();
  });

  it("createCompanyComment skips notification when parent author is the actor", async () => {
    getUser.mockResolvedValue({ id: "same-user" });
    const insertSingle = vi.fn().mockResolvedValue({ data: { id: "c3", body_markdown: "c" }, error: null });
    const insertChain = {
      insert: vi.fn(() => ({
        select: vi.fn(() => ({ single: insertSingle })),
      })),
    };
    const parentChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { created_by: "same-user" }, error: null }),
    };
    fromMock.mockReturnValueOnce(insertChain).mockReturnValueOnce(parentChain);

    await createCompanyComment({
      companyId: "00000000-0000-4000-8000-000000000001",
      bodyMarkdown: "c",
      parentId: "00000000-0000-4000-8000-000000000004",
    });

    expect(createInAppNotificationMock).not.toHaveBeenCalled();
  });

  it("updateComment validates input", async () => {
    getUser.mockResolvedValue({ id: "u1" });
    await expect(updateComment({ commentId: "bad", bodyMarkdown: "a" })).rejects.toThrow();
  });

  it("updateComment updates and returns row", async () => {
    getUser.mockResolvedValue({ id: "u1" });
    const updated = { id: "00000000-0000-4000-8000-000000000010", body_markdown: "new" };
    const single = vi.fn().mockResolvedValue({ data: updated, error: null });
    fromMock.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      select: vi.fn(() => ({ single })),
    });
    await expect(
      updateComment({
        commentId: "00000000-0000-4000-8000-000000000010",
        bodyMarkdown: "new",
      }),
    ).resolves.toEqual(updated);
  });

  it("deleteComment validates input", async () => {
    getUser.mockResolvedValue({ id: "u1" });
    await expect(deleteComment({ commentId: "bad" })).rejects.toThrow();
  });

  it("deleteComment soft-deletes and returns id", async () => {
    getUser.mockResolvedValue({ id: "u1" });
    const single = vi.fn().mockResolvedValue({
      data: { id: "00000000-0000-4000-8000-000000000020" },
      error: null,
    });
    fromMock.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      select: vi.fn(() => ({ single })),
    });
    await expect(
      deleteComment({ commentId: "00000000-0000-4000-8000-000000000020" }),
    ).resolves.toEqual({ id: "00000000-0000-4000-8000-000000000020" });
  });

  it("restoreOwnComment restores row for author", async () => {
    getUser.mockResolvedValue({ id: "u1" });
    const restored = { id: "00000000-0000-4000-8000-000000000030", body_markdown: "back" };
    const single = vi.fn().mockResolvedValue({ data: restored, error: null });
    fromMock.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      select: vi.fn(() => ({ single })),
    });
    await expect(
      restoreOwnComment({ commentId: "00000000-0000-4000-8000-000000000030" }),
    ).resolves.toEqual(restored);
  });
});
