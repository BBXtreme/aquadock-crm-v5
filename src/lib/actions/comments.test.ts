import { beforeEach, describe, expect, it, vi } from "vitest";
import { silenceHandleSupabaseErrorConsole } from "@/test/silence-handle-supabase-error-console";
import {
  createCompanyComment,
  deleteComment,
  deleteCommentAttachment,
  getCommentAttachmentSignedUrl,
  listCompanyCommentAttachments,
  listCompanyComments,
  registerCommentAttachment,
  restoreOwnComment,
  updateComment,
} from "./comments";

const createInAppNotificationMock = vi.hoisted(() => vi.fn().mockResolvedValue(null));
const getUser = vi.fn();
const fromMock = vi.fn();
const createServerSupabaseClientMock = vi.hoisted(() =>
  vi.fn(async () => ({
    from: (...args: unknown[]) => fromMock(...args),
    auth: { getUser: async () => ({ data: { user: null } }) },
    storage: {
      from: () => ({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: "https://signed.example/blob" },
          error: null,
        }),
      }),
    },
  })),
);

vi.mock("@/lib/services/in-app-notifications", () => ({
  createInAppNotification: (...args: unknown[]) => createInAppNotificationMock(...args),
}));

vi.mock("@/lib/auth/get-current-user", () => ({
  getCurrentUser: () => getUser(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: createServerSupabaseClientMock,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: (): never => {
    throw new Error(
      "Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for admin operations",
    );
  },
}));

describe("comments server actions", () => {
  silenceHandleSupabaseErrorConsole();

  beforeEach(() => {
    getUser.mockReset();
    fromMock.mockReset();
    createServerSupabaseClientMock.mockReset();
    createServerSupabaseClientMock.mockImplementation(async () => ({
      from: (...args: unknown[]) => fromMock(...args),
      auth: { getUser: async () => ({ data: { user: null } }) },
      storage: {
        from: () => ({
          createSignedUrl: vi.fn().mockResolvedValue({
            data: { signedUrl: "https://signed.example/blob" },
            error: null,
          }),
        }),
      },
    }));
    createInAppNotificationMock.mockReset();
    createInAppNotificationMock.mockResolvedValue(null);
  });

  it("listCompanyComments throws when unauthenticated", async () => {
    getUser.mockResolvedValue(null);
    await expect(listCompanyComments("00000000-0000-4000-8000-000000000001")).rejects.toThrow("Unauthorized");
  });

  it("listCompanyComments returns rows", async () => {
    getUser.mockResolvedValue({ id: "u1" });
    const rows = [{ id: "c1", body_markdown: "hi", comment_attachments: [] }];
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
    const row = { id: "c1", body_markdown: "x", comment_attachments: [] };
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
    const newRow = { id: "c-reply", body_markdown: "child", comment_attachments: [] };
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
    const insertSingle = vi.fn().mockResolvedValue({
      data: { id: "c2", body_markdown: "c", comment_attachments: [] },
      error: null,
    });
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
    const insertSingle = vi.fn().mockResolvedValue({
      data: { id: "c3", body_markdown: "c", comment_attachments: [] },
      error: null,
    });
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
    const updated = {
      id: "00000000-0000-4000-8000-000000000010",
      body_markdown: "new",
      comment_attachments: [],
    };
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

  it("registerCommentAttachment rejects when storage path does not match company and comment", async () => {
    getUser.mockResolvedValue({ id: "u1" });
    const companyId = "00000000-0000-4000-8000-000000000001";
    const commentId = "00000000-0000-4000-8000-000000000099";
    await expect(
      registerCommentAttachment({
        companyId,
        commentId,
        storageObjectPath: "wrong/path/file.pdf",
        fileName: "file.pdf",
        byteSize: 10,
      }),
    ).rejects.toThrow("Speicherpfad passt nicht");
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("registerCommentAttachment inserts when comment is owned by the user", async () => {
    getUser.mockResolvedValue({ id: "u1" });
    const companyId = "00000000-0000-4000-8000-000000000001";
    const commentId = "00000000-0000-4000-8000-000000000099";
    const storageObjectPath = `${companyId}/${commentId}/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa_file.pdf`;

    const commentChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: commentId,
          entity_type: "company",
          entity_id: companyId,
          created_by: "u1",
          deleted_at: null,
        },
        error: null,
      }),
    };

    const inserted = {
      id: "11111111-1111-1111-1111-111111111111",
      comment_id: commentId,
      file_name: "file.pdf",
      content_type: "application/pdf",
      byte_size: 10,
      storage_object_path: storageObjectPath,
      created_at: "2026-04-01T12:00:00.000Z",
      created_by: "u1",
    };

    const insertChain = {
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: inserted, error: null }),
        })),
      })),
    };

    fromMock.mockReturnValueOnce(commentChain).mockReturnValueOnce(insertChain);

    await expect(
      registerCommentAttachment({
        companyId,
        commentId,
        storageObjectPath,
        fileName: "file.pdf",
        contentType: "application/pdf",
        byteSize: 10,
      }),
    ).resolves.toEqual(inserted);
  });

  it("registerCommentAttachment rejects when comment author is another user", async () => {
    getUser.mockResolvedValue({ id: "u1" });
    const companyId = "00000000-0000-4000-8000-000000000001";
    const commentId = "00000000-0000-4000-8000-000000000099";
    const storageObjectPath = `${companyId}/${commentId}/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa_file.pdf`;

    const commentChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: commentId,
          entity_type: "company",
          entity_id: companyId,
          created_by: "other-person",
          deleted_at: null,
        },
        error: null,
      }),
    };

    fromMock.mockReturnValueOnce(commentChain);

    await expect(
      registerCommentAttachment({
        companyId,
        commentId,
        storageObjectPath,
        fileName: "file.pdf",
        byteSize: 8,
      }),
    ).rejects.toThrow("Nur eigene Kommentare");
  });

  it("listCompanyCommentAttachments returns rows with normalized comment embed", async () => {
    getUser.mockResolvedValue({ id: "u1" });
    const companyId = "00000000-0000-4000-8000-000000000001";
    const listChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: "22222222-2222-2222-2222-222222222222",
            comment_id: "33333333-3333-3333-3333-333333333333",
            file_name: "x.pdf",
            byte_size: 100,
            created_at: "2024-01-01T00:00:00.000Z",
            storage_object_path: `${companyId}/33333333-3333-3333-3333-333333333333/obj.pdf`,
            comments: [
              {
                id: "33333333-3333-3333-3333-333333333333",
                body_markdown: "Hello",
                created_at: "2024-01-01T00:00:00.000Z",
                entity_id: companyId,
                entity_type: "company",
                deleted_at: null,
              },
            ],
          },
        ],
        error: null,
      }),
    };
    fromMock.mockReturnValue(listChain);

    const rows = await listCompanyCommentAttachments(companyId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.file_name).toBe("x.pdf");
    expect(rows[0]?.comments?.id).toBe("33333333-3333-3333-3333-333333333333");
  });

  it("getCommentAttachmentSignedUrl returns signed URL when attachment belongs to active company comment", async () => {
    getUser.mockResolvedValue({ id: "u1" });
    const companyId = "00000000-0000-4000-8000-000000000001";
    const attachmentId = "44444444-4444-4444-4444-444444444444";

    const selectChain = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              storage_object_path: `${companyId}/55555555-5555-5555-5555-555555555555/obj.pdf`,
              file_name: "obj.pdf",
              comments: {
                entity_type: "company",
                entity_id: companyId,
                deleted_at: null,
              },
            },
            error: null,
          }),
        }),
      }),
    };

    fromMock.mockReturnValue(selectChain);

    await expect(getCommentAttachmentSignedUrl({ attachmentId })).resolves.toEqual({
      signedUrl: "https://signed.example/blob",
    });
  });

  it("deleteCommentAttachment throws when the session user is not the comment author", async () => {
    getUser.mockResolvedValue({ id: "00000000-0000-4000-8000-aaaaaaaaaaaa" });
    const attachmentId = "44444444-4444-4444-4444-444444444444";
    const companyIdScoped = "00000000-0000-4000-8000-000000000001";
    const selectChain = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: attachmentId,
              storage_object_path: `${companyIdScoped}/55555555-5555-5555-5555-555555555555/z.pdf`,
              comments: {
                id: "c99",
                entity_type: "company",
                entity_id: companyIdScoped,
                deleted_at: null,
                created_by: "99999999-9999-4999-8999-999999999999",
              },
            },
            error: null,
          }),
        }),
      }),
    };
    fromMock.mockReturnValue(selectChain);
    await expect(deleteCommentAttachment({ attachmentId })).rejects.toThrow(/Autor kann Anhänge entfernen/);
  });

  it("restoreOwnComment restores row for author", async () => {
    getUser.mockResolvedValue({ id: "u1" });
    const restored = {
      id: "00000000-0000-4000-8000-000000000030",
      body_markdown: "back",
      comment_attachments: [],
    };
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
