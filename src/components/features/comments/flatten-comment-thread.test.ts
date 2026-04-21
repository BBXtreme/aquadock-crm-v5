import { describe, expect, it } from "vitest";
import type { CommentWithAuthor } from "@/types/database.types";
import { flattenCommentThread } from "./flatten-comment-thread";

const companyId = "00000000-0000-4000-8000-000000000001";

function c(
  id: string,
  parentId: string | null,
  body: string,
  created: string,
): CommentWithAuthor {
  return {
    id,
    entity_type: "company",
    entity_id: companyId,
    parent_id: parentId,
    body_markdown: body,
    created_at: created,
    updated_at: created,
    created_by: "u1",
    updated_by: "u1",
    deleted_at: null,
    deleted_by: null,
    profiles: null,
  };
}

describe("flattenCommentThread", () => {
  it("orders root then nested replies depth-first", () => {
    const list: CommentWithAuthor[] = [
      c("r1", null, "root", "2025-01-02T10:00:00Z"),
      c("r2", null, "root2", "2025-01-02T11:00:00Z"),
      c("ch1", "r1", "child", "2025-01-02T10:30:00Z"),
    ];
    const out = flattenCommentThread(list).map((x) => x.id);
    expect(out).toEqual(["r1", "ch1", "r2"]);
  });
});
