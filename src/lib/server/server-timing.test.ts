import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createServerTiming, ServerTiming, serverTimingHeaders } from "./server-timing";

describe("ServerTiming", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("records named marks and serialises them as a Server-Timing header value", () => {
    const t = new ServerTiming();
    t.mark("auth", 12);
    t.mark("hybrid_rpc", 88.4, "warm");
    t.mark("total", 250);

    const header = t.header();
    expect(header).toContain("auth;dur=12.0");
    expect(header).toContain('hybrid_rpc;dur=88.4;desc="warm"');
    expect(header).toContain("total;dur=250.0");
    expect(header.split(", ")).toHaveLength(3);
  });

  it("dedupes repeated metric names with last-wins semantics", () => {
    const t = new ServerTiming();
    t.mark("phase_a", 22);
    t.mark("phase_a", 31);
    t.mark("phase_a", 18);

    const snap = t.snapshot();
    expect(snap.phase_a?.dur).toBe(18);
    expect(t.header().match(/phase_a;dur=/g)).toHaveLength(1);
  });

  it("start()/stop() captures elapsed milliseconds", async () => {
    const t = new ServerTiming();
    const stop = t.start("embed_provider");
    await new Promise((resolve) => setTimeout(resolve, 12));
    stop();

    const snap = t.snapshot();
    expect(snap.embed_provider?.dur).toBeGreaterThanOrEqual(10);
  });

  it("serverTimingHeaders returns Server-Timing header when marks exist", () => {
    const t = createServerTiming();
    t.mark("auth", 5);
    t.mark("total", 42);
    const headers = serverTimingHeaders(t);
    expect(headers).toBeDefined();
    expect(headers?.["Server-Timing"]).toContain("auth;dur=5.0");
    expect(headers?.["Server-Timing"]).toContain("total;dur=42.0");
  });

  it("serverTimingHeaders returns undefined when no marks have been recorded", () => {
    const t = createServerTiming();
    expect(serverTimingHeaders(t)).toBeUndefined();
  });

  it("ServerTiming.isEnabled is always true", () => {
    expect(ServerTiming.isEnabled()).toBe(true);
  });
});
