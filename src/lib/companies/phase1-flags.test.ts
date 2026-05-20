import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isEmbedCacheEnabled,
  isLexicalFastpathEnabled,
  isPerfLogsEnabled,
  isRankedIdsCacheEnabled,
  isTwoPhaseHybridEnabled,
  logPhase1Perf,
  PHASE1_DEFAULTS,
} from "./phase1-flags";

const P1_ENV_KEYS = [
  "COMPANIES_P1_EMBED_CACHE_ENABLED",
  "COMPANIES_P1_TWO_PHASE_HYBRID_ENABLED",
  "COMPANIES_P1_RANKED_IDS_CACHE_ENABLED",
  "COMPANIES_P1_LEXICAL_FASTPATH_ENABLED",
  "COMPANIES_P1_PERF_LOGS_ENABLED",
] as const;

describe("phase1-flags", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "test");
    for (const key of P1_ENV_KEYS) {
      vi.stubEnv(key, "");
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults flags to off when env unset in test", () => {
    expect(isEmbedCacheEnabled()).toBe(false);
    expect(isTwoPhaseHybridEnabled()).toBe(false);
    expect(isRankedIdsCacheEnabled()).toBe(false);
    expect(isLexicalFastpathEnabled()).toBe(false);
    expect(isPerfLogsEnabled()).toBe(false);
  });

  it("enables flags when env is true or 1", () => {
    vi.stubEnv("COMPANIES_P1_EMBED_CACHE_ENABLED", "true");
    vi.stubEnv("COMPANIES_P1_TWO_PHASE_HYBRID_ENABLED", "1");
    expect(isEmbedCacheEnabled()).toBe(true);
    expect(isTwoPhaseHybridEnabled()).toBe(true);
  });

  it("disables flags when env is false or 0", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("COMPANIES_P1_EMBED_CACHE_ENABLED", "false");
    vi.stubEnv("COMPANIES_P1_LEXICAL_FASTPATH_ENABLED", "0");
    expect(isEmbedCacheEnabled()).toBe(false);
    expect(isLexicalFastpathEnabled()).toBe(false);
  });

  it("defaults flags on in development when env unset", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(isEmbedCacheEnabled()).toBe(true);
    expect(isRankedIdsCacheEnabled()).toBe(true);
  });

  it("logPhase1Perf is a no-op when perf logs disabled", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    logPhase1Perf("test", { ok: true });
    expect(info).not.toHaveBeenCalled();
    info.mockRestore();
  });

  it("logPhase1Perf writes when perf logs enabled", () => {
    vi.stubEnv("COMPANIES_P1_PERF_LOGS_ENABLED", "true");
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    logPhase1Perf("latency", { ms: 12 });
    expect(info).toHaveBeenCalledWith("[companies-p1] latency", { ms: 12 });
    info.mockRestore();
  });

  it("exposes pinned tuning defaults", () => {
    expect(PHASE1_DEFAULTS.lexicalFastpathMinQueryLength).toBe(3);
    expect(PHASE1_DEFAULTS.embedCacheTtlMs).toBeGreaterThan(0);
  });
});
