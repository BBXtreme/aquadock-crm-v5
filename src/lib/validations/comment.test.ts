import { describe, expect, it } from "vitest";
import {
  createCompanyCommentSchema,
  deleteCommentSchema,
  registerCommentAttachmentSchema,
  updateCommentSchema,
} from "./comment";

describe("comment validation", () => {
  it("createCompanyCommentSchema accepts valid payload", () => {
    const id = "00000000-0000-4000-8000-000000000001";
    expect(
      createCompanyCommentSchema.safeParse({
        companyId: id,
        bodyMarkdown: "Hello **world**",
        parentId: null,
      }).success,
    ).toBe(true);
  });

  it("createCompanyCommentSchema rejects empty body", () => {
    const id = "00000000-0000-4000-8000-000000000001";
    expect(
      createCompanyCommentSchema.safeParse({
        companyId: id,
        bodyMarkdown: "   ",
      }).success,
    ).toBe(false);
  });

  it("updateCommentSchema enforces max length", () => {
    const id = "00000000-0000-4000-8000-000000000002";
    expect(
      updateCommentSchema.safeParse({
        commentId: id,
        bodyMarkdown: "x".repeat(8001),
      }).success,
    ).toBe(false);
  });

  it("deleteCommentSchema requires uuid", () => {
    expect(deleteCommentSchema.safeParse({ commentId: "not-a-uuid" }).success).toBe(false);
  });

  it("registerCommentAttachmentSchema maps empty contentType to null", () => {
    const cid = "00000000-0000-4000-8000-000000000001";
    const qid = "00000000-0000-4000-8000-000000000002";
    const parsed = registerCommentAttachmentSchema.safeParse({
      companyId: cid,
      commentId: qid,
      storageObjectPath: `${cid}/${qid}/id_file.pdf`,
      fileName: "f.pdf",
      contentType: "",
      byteSize: 10,
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      throw new Error("expected parse");
    }
    expect(parsed.data.contentType).toBeNull();
  });

  it("registerCommentAttachmentSchema accepts explicit content type", () => {
    const cid = "00000000-0000-4000-8000-000000000001";
    const qid = "00000000-0000-4000-8000-000000000002";
    const parsed = registerCommentAttachmentSchema.safeParse({
      companyId: cid,
      commentId: qid,
      storageObjectPath: `${cid}/${qid}/id_file.pdf`,
      fileName: "f.pdf",
      contentType: "application/pdf",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      throw new Error("expected parse");
    }
    expect(parsed.data.contentType).toBe("application/pdf");
  });
});
