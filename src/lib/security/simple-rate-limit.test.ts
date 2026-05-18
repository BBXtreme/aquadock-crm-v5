import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { enforceSimpleRateLimit, getRequestIpAddress } from "@/lib/security/simple-rate-limit";

describe("enforceSimpleRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows first request in a new window", () => {
    const result = enforceSimpleRateLimit({
      key: "test-first",
      limit: 2,
      windowMs: 60_000,
    });
    expect(result).toEqual({ allowed: true, retryAfterSeconds: 0 });
  });

  it("blocks when limit is exceeded within the window", () => {
    const params = { key: "test-limit", limit: 2, windowMs: 60_000 };

    expect(enforceSimpleRateLimit(params).allowed).toBe(true);
    expect(enforceSimpleRateLimit(params).allowed).toBe(true);

    const blocked = enforceSimpleRateLimit(params);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("resets the bucket after the window expires", () => {
    const params = { key: "test-reset", limit: 1, windowMs: 10_000 };

    expect(enforceSimpleRateLimit(params).allowed).toBe(true);
    expect(enforceSimpleRateLimit(params).allowed).toBe(false);

    vi.advanceTimersByTime(10_001);

    expect(enforceSimpleRateLimit(params)).toEqual({
      allowed: true,
      retryAfterSeconds: 0,
    });
  });
});

describe("getRequestIpAddress", () => {
  it("prefers the first x-forwarded-for address", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": " 203.0.113.1 , 198.51.100.2" },
    });
    expect(getRequestIpAddress(request)).toBe("203.0.113.1");
  });

  it("falls back to x-real-ip", () => {
    const request = new Request("http://localhost", {
      headers: { "x-real-ip": " 198.51.100.3 " },
    });
    expect(getRequestIpAddress(request)).toBe("198.51.100.3");
  });

  it("returns unknown when no proxy headers are set", () => {
    const request = new Request("http://localhost");
    expect(getRequestIpAddress(request)).toBe("unknown");
  });
});
