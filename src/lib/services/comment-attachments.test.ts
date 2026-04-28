import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/types/database.types";
import {
  buildCommentAttachmentObjectPath,
  COMMENT_ATTACHMENT_SIGNED_URL_TTL_SECONDS,
  commentAttachmentPathMatchesCompanyAndComment,
  createSignedUrlForCommentAttachmentPath,
  sanitizeCommentAttachmentFilename,
} from "./comment-attachments";

describe("comment-attachments", () => {
  it("sanitizeCommentAttachmentFilename trims and replaces unsafe chars", () => {
    expect(sanitizeCommentAttachmentFilename("path/to/evil name!.pdf")).toBe("evilname.pdf");
  });

  it("sanitizeCommentAttachmentFilename falls back to file when sanitization clears the name", () => {
    expect(sanitizeCommentAttachmentFilename("%%%")).toBe("file");
  });

  it("buildCommentAttachmentObjectPath nests company, comment and basename", () => {
    const companyId = "11111111-1111-4111-8111-111111111111";
    const commentId = "22222222-2222-4222-8222-222222222222";
    const p = buildCommentAttachmentObjectPath({
      companyId,
      commentId,
      originalFileName: "x.pdf",
    });
    expect(p.startsWith(`${companyId}/${commentId}/`)).toBe(true);
    expect(p.endsWith("_x.pdf")).toBe(true);
  });

  it("commentAttachmentPathMatchesCompanyAndComment accepts canonical layout", () => {
    const companyId = "11111111-1111-4111-8111-111111111111";
    const commentId = "22222222-2222-4222-8222-222222222222";
    expect(
      commentAttachmentPathMatchesCompanyAndComment(
        `${companyId}/${commentId}/abc_file.pdf`,
        companyId,
        commentId,
      ),
    ).toBe(true);
  });

  it("commentAttachmentPathMatchesCompanyAndComment rejects wrong company", () => {
    const companyId = "11111111-1111-4111-8111-111111111111";
    const wrong = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const commentId = "22222222-2222-4222-8222-222222222222";
    expect(
      commentAttachmentPathMatchesCompanyAndComment(`${wrong}/${commentId}/f.pdf`, companyId, commentId),
    ).toBe(false);
  });

  it("commentAttachmentPathMatchesCompanyAndComment rejects wrong comment id", () => {
    const companyId = "11111111-1111-4111-8111-111111111111";
    const commentId = "22222222-2222-4222-8222-222222222222";
    const wrongComment = "33333333-3333-4333-8333-333333333333";
    expect(
      commentAttachmentPathMatchesCompanyAndComment(`${companyId}/${wrongComment}/x.pdf`, companyId, commentId),
    ).toBe(false);
  });

  it("commentAttachmentPathMatchesCompanyAndComment rejects invalid basename chars in last segment", () => {
    const companyId = "11111111-1111-4111-8111-111111111111";
    const commentId = "22222222-2222-4222-8222-222222222222";
    expect(
      commentAttachmentPathMatchesCompanyAndComment(`${companyId}/${commentId}/weird#file.pdf`, companyId, commentId),
    ).toBe(false);
  });

  it("commentAttachmentPathMatchesCompanyAndComment requires at least three segments", () => {
    const cid = "11111111-1111-4111-8111-111111111111";
    const mid = "22222222-2222-4222-8222-222222222222";
    expect(commentAttachmentPathMatchesCompanyAndComment(`${cid}/${mid}`, cid, mid)).toBe(false);
  });

  describe("createSignedUrlForCommentAttachmentPath", () => {
    const storagePath = `${"11111111-1111-4111-8111-111111111111"}/${"22222222-2222-4222-8222-222222222222"}/id_x.pdf`;

    function makeMockClient(signResult: { data?: { signedUrl?: string }; error?: { message?: string } | null }) {
      const createSignedUrl = vi.fn().mockResolvedValue(signResult);
      return {
        storage: {
          from: vi.fn(() => ({
            createSignedUrl,
          })),
        },
      };
    }

    it("returns signed URL on success without download option", async () => {
      const signed = "https://signed.example/x";
      const client = makeMockClient({ data: { signedUrl: signed }, error: null });
      await expect(
        createSignedUrlForCommentAttachmentPath(
          client as unknown as SupabaseClient<Database>,
          storagePath,
          COMMENT_ATTACHMENT_SIGNED_URL_TTL_SECONDS,
        ),
      ).resolves.toEqual({ signedUrl: signed });

      expect(client.storage.from().createSignedUrl).toHaveBeenCalledWith(
        storagePath,
        COMMENT_ATTACHMENT_SIGNED_URL_TTL_SECONDS,
        undefined,
      );
    });

    it("passes inline download hint when requested", async () => {
      const client = makeMockClient({ data: { signedUrl: "https://signed.example/x?d=1" }, error: null });
      await createSignedUrlForCommentAttachmentPath(
        client as unknown as SupabaseClient<Database>,
        storagePath,
        COMMENT_ATTACHMENT_SIGNED_URL_TTL_SECONDS,
        { downloadFileName: " notes.pdf " },
      );
      expect(client.storage.from().createSignedUrl).toHaveBeenCalledWith(
        storagePath,
        COMMENT_ATTACHMENT_SIGNED_URL_TTL_SECONDS,
        { download: "notes.pdf" },
      );
    });

    it("throws when Supabase returns an error", async () => {
      const client = makeMockClient({ data: {}, error: { message: "no access" } });
      await expect(
        createSignedUrlForCommentAttachmentPath(
          client as unknown as SupabaseClient<Database>,
          storagePath,
          COMMENT_ATTACHMENT_SIGNED_URL_TTL_SECONDS,
        ),
      ).rejects.toThrow("no access");
    });

    it("throws SIGN_URL_MISSING when signedUrl is absent", async () => {
      const client = makeMockClient({ data: {}, error: null });
      await expect(
        createSignedUrlForCommentAttachmentPath(
          client as unknown as SupabaseClient<Database>,
          storagePath,
          COMMENT_ATTACHMENT_SIGNED_URL_TTL_SECONDS,
        ),
      ).rejects.toThrow("SIGN_URL_MISSING");
    });

    it("uses fallback message when error has no message property", async () => {
      const client = makeMockClient({ data: {}, error: {} });
      await expect(
        createSignedUrlForCommentAttachmentPath(
          client as unknown as SupabaseClient<Database>,
          storagePath,
          COMMENT_ATTACHMENT_SIGNED_URL_TTL_SECONDS,
        ),
      ).rejects.toThrow("SIGN_URL_FAILED");
    });
  });
});
