/**
 * Offline tests for comment attachment upload shim (fetch + browser Storage fallback).
 */
import type { Mock } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/comment-attachments", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/services/comment-attachments")>();
  return {
    ...mod,
    /** Lower bound for `too_large` assertions without a multi-megabyte buffer. */
    COMMENT_ATTACHMENT_MAX_BYTES: 1024,
  };
});

import { COMMENT_ATTACHMENT_MAX_BYTES, COMMENT_FILES_BUCKET } from "@/lib/services/comment-attachments";

vi.mock("@/lib/supabase/browser", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/actions/comments", () => ({
  registerCommentAttachment: vi.fn(),
}));

import { registerCommentAttachment } from "@/lib/actions/comments";
import { createClient } from "@/lib/supabase/browser";
import { uploadCommentAttachmentsForComment } from "./upload-comment-attachments";

describe("uploadCommentAttachmentsForComment", () => {
  let createClientMock: Mock;
  let registerCommentAttachmentMock: Mock;
  let mockStorageUpload: Mock;
  let fetchStub: Mock;

  beforeEach(() => {
    createClientMock = createClient as Mock;
    registerCommentAttachmentMock = registerCommentAttachment as Mock;
    mockStorageUpload = vi.fn().mockResolvedValue({ error: null });
    createClientMock.mockReturnValue({
      storage: {
        from: vi.fn((bucket: string) => {
          expect(bucket).toBe(COMMENT_FILES_BUCKET);
          return {
            upload: mockStorageUpload,
          };
        }),
      },
    });
    registerCommentAttachmentMock.mockResolvedValue({});
    fetchStub = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    registerCommentAttachmentMock.mockReset();
    registerCommentAttachmentMock.mockResolvedValue({});
  });

  it("returns too_large when a file exceeds the max", async () => {
    const file = new File([new Uint8Array(COMMENT_ATTACHMENT_MAX_BYTES + 1)], "huge.bin");

    await expect(
      uploadCommentAttachmentsForComment({
        companyId: "00000000-0000-4000-8000-000000000001",
        commentId: "00000000-0000-4000-8000-000000000002",
        files: [file],
      }),
    ).resolves.toEqual({ ok: false, kind: "too_large" });
    expect(fetchStub).not.toHaveBeenCalled();
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("skips browser storage when API upload succeeds", async () => {
    await expect(
      uploadCommentAttachmentsForComment({
        companyId: "00000000-0000-4000-8000-000000000001",
        commentId: "00000000-0000-4000-8000-000000000002",
        files: [new File([], "a.txt")],
      }),
    ).resolves.toEqual({ ok: true });
    expect(fetchStub).toHaveBeenCalled();
    expect(createClientMock).not.toHaveBeenCalled();
    expect(mockStorageUpload).not.toHaveBeenCalled();
  });

  it("returns upload error JSON when POST fails without 503", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ error: " quota " }), { status: 413, statusText: "X" })),
    );

    await expect(
      uploadCommentAttachmentsForComment({
        companyId: "00000000-0000-4000-8000-000000000001",
        commentId: "00000000-0000-4000-8000-000000000002",
        files: [new File([], "a.txt")],
      }),
    ).resolves.toEqual({ ok: false, kind: "upload", message: " quota " });
  });

  it("uses statusText when error JSON has no usable error field", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 400, statusText: "Bad Thing" })),
    );

    const res = await uploadCommentAttachmentsForComment({
      companyId: "00000000-0000-4000-8000-000000000001",
      commentId: "00000000-0000-4000-8000-000000000002",
      files: [new File([], "a.txt")],
    });
    expect(res).toEqual({ ok: false, kind: "upload", message: "Bad Thing" });
  });

  it("falls back to browser upload when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    const companyId = "00000000-0000-4000-8000-000000000001";
    const commentId = "00000000-0000-4000-8000-000000000002";
    const file = new File([new Uint8Array([9])], "b.txt", { type: "text/plain" });
    await expect(uploadCommentAttachmentsForComment({ companyId, commentId, files: [file] })).resolves.toEqual({
      ok: true,
    });
    expect(createClientMock).toHaveBeenCalled();
    expect(mockStorageUpload).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^${companyId}/${commentId}/[0-9a-f-]+_b\\.txt$`, "u")),
      file,
      expect.objectContaining({ contentType: "text/plain", upsert: false }),
    );
    expect(registerCommentAttachmentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId,
        commentId,
        fileName: "b.txt",
        byteSize: 1,
      }),
    );
  });

  it("returns register failure when registerCommentAttachment throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 503, statusText: "Service Unavailable" })),
    );
    registerCommentAttachmentMock.mockRejectedValue(new Error("rls"));

    await expect(
      uploadCommentAttachmentsForComment({
        companyId: "00000000-0000-4000-8000-000000000001",
        commentId: "00000000-0000-4000-8000-000000000002",
        files: [new File([new Uint8Array([1])], "c.txt")],
      }),
    ).resolves.toEqual({ ok: false, kind: "register", message: "rls" });
  });

  it("uses application/octet-stream when file type is blank", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 503, statusText: "" })),
    );

    await uploadCommentAttachmentsForComment({
      companyId: "00000000-0000-4000-8000-000000000001",
      commentId: "00000000-0000-4000-8000-000000000002",
      files: [new File([], "raw.bin")],
    });
    expect(mockStorageUpload.mock.calls.at(0)?.[2]).toMatchObject({
      contentType: "application/octet-stream",
    });
  });
});
