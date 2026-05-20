import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TtlCache } from "./ttl-cache";

describe("TtlCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-20T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns undefined on miss and increments miss counter", () => {
    const cache = new TtlCache<string, number>(60_000, 10);
    expect(cache.get("missing")).toBeUndefined();
    expect(cache.stats()).toMatchObject({ size: 0, hits: 0, misses: 1 });
  });

  it("returns stored value on hit and updates touchedAt", () => {
    const cache = new TtlCache<string, string>(60_000, 10);
    cache.set("a", "one");
    vi.advanceTimersByTime(1_000);
    expect(cache.get("a")).toBe("one");
    expect(cache.stats()).toMatchObject({ size: 1, hits: 1, misses: 0 });
  });

  it("treats expired entries as miss and removes them", () => {
    const cache = new TtlCache<string, string>(5_000, 10);
    cache.set("a", "old");
    vi.advanceTimersByTime(5_001);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.stats()).toMatchObject({ size: 0, misses: 1, expired: 1 });
  });

  it("prunes expired entries on periodic writes", () => {
    const cache = new TtlCache<string, string>(1_000, 100, 2);
    cache.set("a", "1");
    vi.advanceTimersByTime(1_001);
    cache.set("b", "2");
    expect(cache.get("a")).toBeUndefined();
    cache.set("c", "3");
    expect(cache.stats().expired).toBeGreaterThanOrEqual(1);
  });

  it("evicts least recently touched entry when over maxEntries", () => {
    const cache = new TtlCache<string, string>(60_000, 2);
    cache.set("first", "1");
    vi.advanceTimersByTime(100);
    cache.set("second", "2");
    vi.advanceTimersByTime(100);
    cache.set("third", "3");
    expect(cache.get("first")).toBeUndefined();
    expect(cache.get("second")).toBe("2");
    expect(cache.get("third")).toBe("3");
    expect(cache.stats().evictions).toBe(1);
  });

  it("clear removes all entries", () => {
    const cache = new TtlCache<string, number>(60_000, 10);
    cache.set("x", 1);
    cache.clear();
    expect(cache.get("x")).toBeUndefined();
    expect(cache.stats().size).toBe(0);
  });
});
