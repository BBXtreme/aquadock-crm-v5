import { describe, expect, it } from "vitest";
import { effectiveEnrichmentUsedToday, enrichmentUtcDayKey } from "@/lib/ai/enrichment-rate-limit";

describe("enrichment-rate-limit", () => {
  it("effectiveEnrichmentUsedToday returns 0 when last reset date is not today", () => {
    expect(effectiveEnrichmentUsedToday(10, "2020-01-01", "2026-04-11")).toBe(0);
    expect(effectiveEnrichmentUsedToday(0, "", "2026-04-11")).toBe(0);
  });

  it("effectiveEnrichmentUsedToday returns stored count when last reset matches today", () => {
    expect(effectiveEnrichmentUsedToday(3, "2026-04-11", "2026-04-11")).toBe(3);
    expect(effectiveEnrichmentUsedToday(0, "2026-04-11", "2026-04-11")).toBe(0);
  });

  it("effectiveEnrichmentUsedToday trims whitespace on dates", () => {
    expect(effectiveEnrichmentUsedToday(2, "  2026-04-11  ", "2026-04-11")).toBe(2);
  });

  it("effectiveEnrichmentUsedToday clamps invalid stored values", () => {
    expect(effectiveEnrichmentUsedToday(-1, "2026-04-11", "2026-04-11")).toBe(0);
    expect(effectiveEnrichmentUsedToday(Number.NaN, "2026-04-11", "2026-04-11")).toBe(0);
    expect(effectiveEnrichmentUsedToday(2_000_000, "2026-04-11", "2026-04-11")).toBe(1_000_000);
  });

  it("enrichmentUtcDayKey matches YYYY-MM-DD in UTC", () => {
    const key = enrichmentUtcDayKey();
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
