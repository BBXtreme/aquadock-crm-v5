import { describe, expect, it } from "vitest";
import { timelineActivityBadgeClassName } from "@/lib/constants/timeline-activity-badge";

describe("timelineActivityBadgeClassName", () => {
  it("returns import styling for import display type", () => {
    const cls = timelineActivityBadgeClassName("import");
    expect(cls).toContain("emerald");
  });

  it("falls back to other styling for unknown display types", () => {
    const cls = timelineActivityBadgeClassName("unknown_future_type");
    expect(cls).toContain("slate");
  });
});
