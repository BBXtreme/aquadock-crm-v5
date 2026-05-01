/** FormData + `Request#formData()` multipart parsing is unreliable in jsdom; Node matches production. */
// @vitest-environment node

import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/get-current-user", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/actions/comments", () => ({
  registerCommentAttachment: vi.fn(),
}));

import { registerCommentAttachment } from "@/lib/actions/comments";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { COMMENT_ATTACHMENT_MAX_BYTES } from "@/lib/services/comment-attachments";
import { createAdminClient } from "@/lib/supabase/admin";
import { POST } from "./route";

describe("POST /api/comment-attachments/upload", () => {
  const getCurrentUserMock = getCurrentUser as Mock<
    () => Promise<{ id: string } | null>
  >;
  const createAdminClientMock = createAdminClient as Mock;
  const registerCommentAttachmentMock = registerCommentAttachment as Mock;

  const mockStorageUpload = vi.fn();
  const mockStorageRemove = vi.fn();

  beforeEach(() => {
    getCurrentUserMock.mockReset();
    createAdminClientMock.mockReset();
    registerCommentAttachmentMock.mockReset();
    mockStorageUpload.mockReset();
    mockStorageRemove.mockReset();

    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    mockStorageUpload.mockResolvedValue({ error: null });
    mockStorageRemove.mockResolvedValue({ error: null });
    registerCommentAttachmentMock.mockResolvedValue({ id: "row-1" });
    createAdminClientMock.mockReturnValue({
      storage: {
        from: vi.fn(() => ({
          upload: mockStorageUpload,
          remove: mockStorageRemove,
        })),
      },
    });
  });

  it("returns 401 when unauthenticated", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    const form = new FormData();
    form.set("companyId", "00000000-0000-4000-8000-000000000001");
    form.set("commentId", "00000000-0000-4000-8000-000000000002");
    form.set("file", new File([new Uint8Array([1])], "a.txt", { type: "text/plain" }));

    const res = await POST(
      new Request("http://localhost/api/comment-attachments/upload", {
        method: "POST",
        body: form,
      }),
    );

    expect(res.status).toBe(401);
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });

  it("returns 400 when commentId is missing", async () => {
    const form = new FormData();
    form.set("companyId", "00000000-0000-4000-8000-000000000001");
    form.set("file", new File([new Uint8Array([1])], "a.txt"));

    const res = await POST(
      new Request("http://localhost/api/comment-attachments/upload", {
        method: "POST",
        body: form,
      }),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("commentId");
  });

  it("returns 400 when multipart body cannot be parsed", async () => {
    const res = await POST(
      new Request("http://localhost/api/comment-attachments/upload", {
        method: "POST",
        headers: { "content-type": "multipart/form-data; boundary=----x" },
        body: "not-valid-multipart",
      }),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("multipart");
  });

  it("returns 400 when file field is not a File", async () => {
    const form = new FormData();
    form.set("companyId", "00000000-0000-4000-8000-000000000001");
    form.set("commentId", "00000000-0000-4000-8000-000000000002");
    form.set("file", "plain string");

    const res = await POST(
      new Request("http://localhost/api/comment-attachments/upload", {
        method: "POST",
        body: form,
      }),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("file");
  });

  it("returns 413 when file exceeds max size", async () => {
    const big = new Uint8Array(COMMENT_ATTACHMENT_MAX_BYTES + 1);
    const form = new FormData();
    form.set("companyId", "00000000-0000-4000-8000-000000000001");
    form.set("commentId", "00000000-0000-4000-8000-000000000002");
    form.set("file", new File([big], "huge.bin"));

    const res = await POST(
      new Request("http://localhost/api/comment-attachments/upload", {
        method: "POST",
        body: form,
      }),
    );

    expect(res.status).toBe(413);
  });

  it("returns 500 when storage upload fails", async () => {
    mockStorageUpload.mockResolvedValue({ error: { message: "bucket missing" } });

    const form = new FormData();
    form.set("companyId", "00000000-0000-4000-8000-000000000001");
    form.set("commentId", "00000000-0000-4000-8000-000000000002");
    form.set("file", new File([new Uint8Array([1])], "a.txt", { type: "text/plain" }));

    const res = await POST(
      new Request("http://localhost/api/comment-attachments/upload", {
        method: "POST",
        body: form,
      }),
    );

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("bucket");
    expect(registerCommentAttachmentMock).not.toHaveBeenCalled();
  });

  it("returns 400 when companyId is missing", async () => {
    const form = new FormData();
    form.set("commentId", "00000000-0000-4000-8000-000000000002");
    form.set("file", new File([new Uint8Array([1])], "a.txt"));

    const res = await POST(
      new Request("http://localhost/api/comment-attachments/upload", {
        method: "POST",
        body: form,
      }),
    );

    expect(res.status).toBe(400);
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });

  it("returns 503 when service role admin client cannot be created", async () => {
    createAdminClientMock.mockImplementation(() => {
      throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
    });

    const form = new FormData();
    form.set("companyId", "00000000-0000-4000-8000-000000000001");
    form.set("commentId", "00000000-0000-4000-8000-000000000002");
    form.set("file", new File([new Uint8Array([1])], "a.txt", { type: "text/plain" }));

    const res = await POST(
      new Request("http://localhost/api/comment-attachments/upload", {
        method: "POST",
        body: form,
      }),
    );

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("uploads then registers and returns 200 with paths", async () => {
    const companyId = "00000000-0000-4000-8000-000000000001";
    const commentId = "00000000-0000-4000-8000-000000000002";
    const file = new File([new Uint8Array([1, 2, 3])], "notes.txt", { type: "text/plain" });

    const form = new FormData();
    form.set("companyId", companyId);
    form.set("commentId", commentId);
    form.set("file", file);

    const res = await POST(
      new Request("http://localhost/api/comment-attachments/upload", {
        method: "POST",
        body: form,
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBe("row-1");
    expect(body.storageObjectPath).toMatch(
      new RegExp(`^${companyId}/${commentId}/[^/]+_notes\\.txt$`),
    );

    expect(mockStorageUpload).toHaveBeenCalledTimes(1);
    const call = mockStorageUpload.mock.calls[0];
    expect(Array.isArray(call)).toBe(true);
    const [storagePathArg, bufferArg] = call ?? [];
    expect(typeof storagePathArg).toBe("string");
    expect(Buffer.isBuffer(bufferArg)).toBe(true);
    expect(Buffer.from(bufferArg as Buffer).equals(Buffer.from([1, 2, 3]))).toBe(true);

    expect(registerCommentAttachmentMock).toHaveBeenCalledTimes(1);
    const registerArg = registerCommentAttachmentMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(registerArg?.companyId).toBe(companyId);
    expect(registerArg?.commentId).toBe(commentId);
    expect(registerArg?.storageObjectPath).toBe(storagePathArg);
    expect(registerArg?.byteSize).toBe(3);
  });

  it("removes uploaded object when register fails", async () => {
    registerCommentAttachmentMock.mockRejectedValue(new Error("rls_denied"));

    const form = new FormData();
    form.set("companyId", "00000000-0000-4000-8000-000000000001");
    form.set("commentId", "00000000-0000-4000-8000-000000000002");
    form.set("file", new File([new Uint8Array([1])], "a.txt"));

    const res = await POST(
      new Request("http://localhost/api/comment-attachments/upload", {
        method: "POST",
        body: form,
      }),
    );

    expect(res.status).toBe(400);
    expect(mockStorageRemove).toHaveBeenCalledTimes(1);
    const paths = mockStorageRemove.mock.calls[0]?.[0];
    expect(Array.isArray(paths)).toBe(true);
    expect((paths as string[])[0]).toContain("00000000-0000-4000-8000-000000000001");
  });
});
