import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  effectiveEnrichmentUsedToday,
  enrichmentUsageRemaining,
  enrichmentUtcDayKey,
  refundEnrichmentSlots,
  tryCommitEnrichmentSlots,
} from "@/lib/ai/enrichment-rate-limit";
import {
  AI_ENRICHMENT_LAST_RESET_DATE_KEY,
  AI_ENRICHMENT_USED_TODAY_KEY,
} from "@/lib/constants/ai-enrichment-user-settings";

function makeSettingsClient(opts: {
  selectRows?: { key: string; value: unknown }[];
  selectError?: { message: string };
  upsertErrors?: Array<unknown | null>;
}): SupabaseClient {
  let upsertIdx = 0;
  const upsert = vi.fn().mockImplementation(() => {
    const err = opts.upsertErrors?.[upsertIdx++] ?? null;
    return Promise.resolve({ error: err });
  });
  return {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: opts.selectRows ?? [],
        error: opts.selectError ?? null,
      }),
      upsert,
    })),
  } as unknown as SupabaseClient;
}

describe("enrichment-rate-limit", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it("enrichmentUsageRemaining returns 0 when dailyLimit is not positive", async () => {
    const client = makeSettingsClient({});
    await expect(enrichmentUsageRemaining(client, "u1", 0)).resolves.toBe(0);
    await expect(enrichmentUsageRemaining(client, "u1", -1)).resolves.toBe(0);
  });

  it("enrichmentUsageRemaining subtracts effective usage from string and number stored values", async () => {
    const today = enrichmentUtcDayKey();
    const client = makeSettingsClient({
      selectRows: [
        { key: AI_ENRICHMENT_USED_TODAY_KEY, value: "4" },
        { key: AI_ENRICHMENT_LAST_RESET_DATE_KEY, value: `  ${today}  ` },
      ],
    });
    await expect(enrichmentUsageRemaining(client, "u1", 10)).resolves.toBe(6);
  });

  it("enrichmentUsageRemaining throws when select fails", async () => {
    const client = makeSettingsClient({ selectError: { message: "db down" } });
    await expect(enrichmentUsageRemaining(client, "u1", 5)).rejects.toThrow();
  });

  it("tryCommitEnrichmentSlots returns true for non-positive slots", async () => {
    const client = makeSettingsClient({});
    await expect(tryCommitEnrichmentSlots(client, "u1", 0, 10)).resolves.toBe(true);
    await expect(tryCommitEnrichmentSlots(client, "u1", -2, 10)).resolves.toBe(true);
  });

  it("tryCommitEnrichmentSlots returns false when dailyLimit is not positive", async () => {
    const client = makeSettingsClient({});
    await expect(tryCommitEnrichmentSlots(client, "u1", 1, 0)).resolves.toBe(false);
  });

  it("tryCommitEnrichmentSlots returns false when cap would be exceeded", async () => {
    const today = enrichmentUtcDayKey();
    const client = makeSettingsClient({
      selectRows: [
        { key: AI_ENRICHMENT_USED_TODAY_KEY, value: 9 },
        { key: AI_ENRICHMENT_LAST_RESET_DATE_KEY, value: today },
      ],
    });
    await expect(tryCommitEnrichmentSlots(client, "u1", 2, 10)).resolves.toBe(false);
  });

  it("tryCommitEnrichmentSlots returns true and upserts twice on success", async () => {
    const today = enrichmentUtcDayKey();
    const client = makeSettingsClient({
      selectRows: [{ key: AI_ENRICHMENT_LAST_RESET_DATE_KEY, value: "2000-01-01" }],
    });
    await expect(tryCommitEnrichmentSlots(client, "u1", 2, 10)).resolves.toBe(true);
    const fromMock = vi.mocked(client.from);
    const last = fromMock.mock.results.at(-1)?.value as { upsert: ReturnType<typeof vi.fn> };
    expect(last.upsert).toHaveBeenCalledTimes(2);
    const upsertCalls = last.upsert.mock.calls;
    expect(upsertCalls).toHaveLength(2);
    const firstPayload = upsertCalls[0]?.[0];
    const secondPayload = upsertCalls[1]?.[0];
    if (firstPayload === undefined || secondPayload === undefined) {
      throw new Error("expected two upsert payloads");
    }
    expect(firstPayload).toMatchObject({
      key: AI_ENRICHMENT_USED_TODAY_KEY,
      value: 2,
    });
    expect(secondPayload).toMatchObject({
      key: AI_ENRICHMENT_LAST_RESET_DATE_KEY,
      value: today,
    });
  });

  it("tryCommitEnrichmentSlots returns false when upsert errors", async () => {
    const client = makeSettingsClient({
      selectRows: [],
      upsertErrors: [{ message: "write fail" }],
    });
    await expect(tryCommitEnrichmentSlots(client, "u1", 1, 10)).resolves.toBe(false);
  });

  it("tryCommitEnrichmentSlots returns false when read throws", async () => {
    const client = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockRejectedValue(new Error("network")),
      })),
    } as unknown as SupabaseClient;
    await expect(tryCommitEnrichmentSlots(client, "u1", 1, 10)).resolves.toBe(false);
  });

  it("refundEnrichmentSlots no-ops for non-positive slots", async () => {
    const client = makeSettingsClient({});
    await refundEnrichmentSlots(client, "u1", 0);
    await refundEnrichmentSlots(client, "u1", -1);
    expect(client.from).not.toHaveBeenCalled();
  });

  it("refundEnrichmentSlots returns when last reset is not today", async () => {
    const client = makeSettingsClient({
      selectRows: [{ key: AI_ENRICHMENT_LAST_RESET_DATE_KEY, value: "1999-12-31" }],
    });
    await refundEnrichmentSlots(client, "u1", 2);
    const fromMock = vi.mocked(client.from);
    expect(fromMock).toHaveBeenCalledTimes(1);
  });

  it("refundEnrichmentSlots decrements stored usage for today", async () => {
    const today = enrichmentUtcDayKey();
    const client = makeSettingsClient({
      selectRows: [
        { key: AI_ENRICHMENT_USED_TODAY_KEY, value: 5 },
        { key: AI_ENRICHMENT_LAST_RESET_DATE_KEY, value: today },
      ],
    });
    await refundEnrichmentSlots(client, "u1", 2);
    const fromMock = vi.mocked(client.from);
    const upsertCalls = fromMock.mock.results
      .map((r) => (r.value as { upsert?: ReturnType<typeof vi.fn> }).upsert)
      .filter(Boolean);
    const lastUpsert = upsertCalls.at(-1);
    expect(lastUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u1",
        key: AI_ENRICHMENT_USED_TODAY_KEY,
        value: 3,
      }),
      { onConflict: "user_id,key" },
    );
  });

  it("refundEnrichmentSlots throws on upsert error", async () => {
    const today = enrichmentUtcDayKey();
    const client = makeSettingsClient({
      selectRows: [
        { key: AI_ENRICHMENT_USED_TODAY_KEY, value: 1 },
        { key: AI_ENRICHMENT_LAST_RESET_DATE_KEY, value: today },
      ],
      upsertErrors: [{ message: "refund blocked" }],
    });
    await expect(refundEnrichmentSlots(client, "u1", 1)).rejects.toThrow();
  });
});
