import { describe, expect, it } from "vitest";

import { compareSemver } from "@/lib/changelog/compare-semver";

import { getChangelogEntriesSorted } from "./changelog";

describe("getChangelogEntriesSorted", () => {
  it("orders newer releasedAt before older", () => {
    const sorted = getChangelogEntriesSorted();
    for (let i = 0; i < sorted.length - 1; i++) {
      const cur = sorted[i];
      const next = sorted[i + 1];
      if (cur === undefined || next === undefined) {
        continue;
      }
      expect(cur.releasedAt >= next.releasedAt).toBe(true);
    }
  });

  it("when releasedAt ties, orders semver descending (newer patch first)", () => {
    const sorted = getChangelogEntriesSorted();
    for (let i = 0; i < sorted.length - 1; i++) {
      const cur = sorted[i];
      const next = sorted[i + 1];
      if (cur === undefined || next === undefined) {
        continue;
      }
      if (cur.releasedAt !== next.releasedAt) {
        continue;
      }
      const cmp = compareSemver(cur.version, next.version);
      expect(cmp, `${cur.version} vs ${next.version} on ${cur.releasedAt}`).toBe(1);
    }
  });
});
