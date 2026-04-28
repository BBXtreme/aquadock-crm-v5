import { describe, expect, it } from "vitest";
import {
  buildCommentAttachmentObjectPath,
  commentAttachmentPathMatchesCompanyAndComment,
  sanitizeCommentAttachmentFilename,
} from "./comment-attachments";

describe("comment-attachments", () => {
  it("sanitizeCommentAttachmentFilename trims and replaces unsafe chars", () => {
    expect(sanitizeCommentAttachmentFilename("path/to/evil name!.pdf")).toBe("evilname.pdf");
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

  it("commentAttachmentPathMatchesCompanyAndComment requires at least three segments", () => {
    const cid = "11111111-1111-4111-8111-111111111111";
    const mid = "22222222-2222-4222-8222-222222222222";
    expect(commentAttachmentPathMatchesCompanyAndComment(`${cid}/${mid}`, cid, mid)).toBe(false);
  });
});
