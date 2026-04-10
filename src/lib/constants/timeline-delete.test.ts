/**
 * Contract for {@link ./timeline-delete.ts}: server action `deleteTimelineEntryWithTrash` throws
 * `new Error(TIMELINE_DELETE_NO_ACTIVE_ROW)` when no active row exists; clients compare `err.message`.
 */

import { describe, expect, it } from "vitest";
import { TIMELINE_DELETE_NO_ACTIVE_ROW } from "@/lib/constants/timeline-delete";

describe("TIMELINE_DELETE_NO_ACTIVE_ROW", () => {
  it("matches Error.message thrown for inactive / already-trashed timeline rows", () => {
    expect(TIMELINE_DELETE_NO_ACTIVE_ROW).toBe("TIMELINE_DELETE_NO_ACTIVE_ROW");
    expect(new Error(TIMELINE_DELETE_NO_ACTIVE_ROW).message).toBe(TIMELINE_DELETE_NO_ACTIVE_ROW);
  });
});
