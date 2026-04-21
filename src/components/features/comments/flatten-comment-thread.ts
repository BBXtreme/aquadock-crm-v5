import type { CommentWithAuthor } from "@/types/database.types";

/** Order: each root, then its descendants depth-first (by created_at). */
export function flattenCommentThread(comments: CommentWithAuthor[]): CommentWithAuthor[] {
  const byParent = new Map<string | null, CommentWithAuthor[]>();
  for (const c of comments) {
    const key = c.parent_id ?? null;
    const list = byParent.get(key) ?? [];
    list.push(c);
    byParent.set(key, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return ta - tb;
    });
  }

  const out: CommentWithAuthor[] = [];
  const roots = byParent.get(null) ?? [];

  const walk = (parentId: string) => {
    const children = byParent.get(parentId) ?? [];
    for (const ch of children) {
      out.push(ch);
      walk(ch.id);
    }
  };

  for (const r of roots) {
    out.push(r);
    walk(r.id);
  }
  return out;
}
