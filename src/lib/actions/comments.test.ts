import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCompanyComment, deleteComment, listCompanyComments, updateComment } from "./comments";

const getUser = vi.fn();
const fromMock = vi.fn();

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
  beforeEach(() => {
    getUser.mockReset();
    fromMock.mockReset();
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

  it("updateComment validates input", async () => {
    getUser.mockResolvedValue({ id: "u1" });
    await expect(updateComment({ commentId: "bad", bodyMarkdown: "a" })).rejects.toThrow();
  });

  it("deleteComment validates input", async () => {
    getUser.mockResolvedValue({ id: "u1" });
    await expect(deleteComment({ commentId: "bad" })).rejects.toThrow();
  });
});
