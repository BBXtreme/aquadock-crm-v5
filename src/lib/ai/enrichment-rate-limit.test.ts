import { describe, expect, it } from "vitest";
import {
  enrichmentUsageRemaining,
  refundEnrichmentSlots,
  tryCommitEnrichmentSlots,
} from "@/lib/ai/enrichment-rate-limit";

describe("enrichment-rate-limit", () => {
  it("reserves slots atomically up to the daily cap", () => {
    const userId = `test-user-${Math.random().toString(36).slice(2)}`;
    const limit = 3;

    expect(tryCommitEnrichmentSlots(userId, 2, limit)).toBe(true);
    expect(enrichmentUsageRemaining(userId, limit)).toBe(1);
    expect(tryCommitEnrichmentSlots(userId, 2, limit)).toBe(false);
    refundEnrichmentSlots(userId, 1);
    expect(enrichmentUsageRemaining(userId, limit)).toBe(2);
    expect(tryCommitEnrichmentSlots(userId, 2, limit)).toBe(true);
    expect(enrichmentUsageRemaining(userId, limit)).toBe(0);
  });
});
