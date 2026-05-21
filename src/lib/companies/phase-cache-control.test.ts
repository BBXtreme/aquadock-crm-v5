import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bumpCompaniesGeneration,
  currentCompaniesGeneration,
  isEmbedCacheEnabled,
  isLexicalFastpathEnabled,
  isPerfLogsEnabled,
  isPhase2ReadsEnabled,
  isPhase2WritesEnabled,
  isRankedIdsCacheEnabled,
  isTwoPhaseHybridEnabled,
  logCompaniesPerf,
  logPhase1Perf,
  PHASE1_DEFAULTS,
  resetCompaniesGenerationForTests,
} from "./phase-cache-control";

const P1_ENV_KEYS = [
  "COMPANIES_P1_EMBED_CACHE_ENABLED",
  "COMPANIES_P1_TWO_PHASE_HYBRID_ENABLED",
  "COMPANIES_P1_RANKED_IDS_CACHE_ENABLED",
  "COMPANIES_P1_LEXICAL_FASTPATH_ENABLED",
  "COMPANIES_P1_PERF_LOGS_ENABLED",
] as const;

const P2_ENV_KEYS = [
  "COMPANIES_P2_READS_ENABLED",
  "NEXT_PUBLIC_COMPANIES_P2_READS_ENABLED",
  "COMPANIES_P2_WRITES_ENABLED",
] as const;

describe("phase-cache-control", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "test");
    for (const key of [...P1_ENV_KEYS, ...P2_ENV_KEYS]) {
      vi.stubEnv(key, "");
    }
    resetCompaniesGenerationForTests();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetCompaniesGenerationForTests();
  });

  it("defaults all flags off when env unset in test", () => {
    expect(isEmbedCacheEnabled()).toBe(false);
    expect(isTwoPhaseHybridEnabled()).toBe(false);
    expect(isRankedIdsCacheEnabled()).toBe(false);
    expect(isLexicalFastpathEnabled()).toBe(false);
    expect(isPerfLogsEnabled()).toBe(false);
    expect(isPhase2ReadsEnabled()).toBe(false);
    expect(isPhase2WritesEnabled()).toBe(false);
  });

  it("enables flags when env is true or 1", () => {
    vi.stubEnv("COMPANIES_P1_EMBED_CACHE_ENABLED", "true");
    vi.stubEnv("COMPANIES_P1_TWO_PHASE_HYBRID_ENABLED", "1");
    vi.stubEnv("COMPANIES_P2_READS_ENABLED", "true");
    vi.stubEnv("COMPANIES_P2_WRITES_ENABLED", "1");
    expect(isEmbedCacheEnabled()).toBe(true);
    expect(isTwoPhaseHybridEnabled()).toBe(true);
    expect(isPhase2ReadsEnabled()).toBe(true);
    expect(isPhase2WritesEnabled()).toBe(true);
  });

  it("disables flags when env is false or 0", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("COMPANIES_P1_EMBED_CACHE_ENABLED", "false");
    vi.stubEnv("COMPANIES_P1_LEXICAL_FASTPATH_ENABLED", "0");
    vi.stubEnv("COMPANIES_P2_READS_ENABLED", "false");
    expect(isEmbedCacheEnabled()).toBe(false);
    expect(isLexicalFastpathEnabled()).toBe(false);
    expect(isPhase2ReadsEnabled()).toBe(false);
  });

  it("defaults flags on in development when env unset", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(isEmbedCacheEnabled()).toBe(true);
    expect(isRankedIdsCacheEnabled()).toBe(true);
    expect(isPhase2ReadsEnabled()).toBe(true);
    expect(isPhase2WritesEnabled()).toBe(true);
  });

  it("isPhase2ReadsEnabled honours NEXT_PUBLIC_ companion for client visibility", () => {
    vi.stubEnv("NEXT_PUBLIC_COMPANIES_P2_READS_ENABLED", "true");
    expect(isPhase2ReadsEnabled()).toBe(true);
    vi.stubEnv("NEXT_PUBLIC_COMPANIES_P2_READS_ENABLED", "false");
    expect(isPhase2ReadsEnabled()).toBe(false);
  });

  it("logPhase1Perf is a no-op when perf logs disabled", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    logPhase1Perf("test", { ok: true });
    expect(info).not.toHaveBeenCalled();
    info.mockRestore();
  });

  it("logPhase1Perf writes [companies-p1] when perf logs enabled", () => {
    vi.stubEnv("COMPANIES_P1_PERF_LOGS_ENABLED", "true");
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    logPhase1Perf("latency", { ms: 12 });
    expect(info).toHaveBeenCalledWith("[companies-p1] latency", { ms: 12 });
    info.mockRestore();
  });

  it("logCompaniesPerf writes phase-tagged prefix when perf logs enabled", () => {
    vi.stubEnv("COMPANIES_P1_PERF_LOGS_ENABLED", "true");
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    logCompaniesPerf("p2", "phase_b", { ms: 22 });
    expect(info).toHaveBeenCalledWith("[companies-p2] phase_b", { ms: 22 });
    info.mockRestore();
  });

  it("exposes pinned tuning defaults", () => {
    expect(PHASE1_DEFAULTS.lexicalFastpathMinQueryLength).toBe(3);
    expect(PHASE1_DEFAULTS.embedCacheTtlMs).toBeGreaterThan(0);
  });

  it("bumpCompaniesGeneration is a no-op when writes flag off", () => {
    // Default in test env: writes flag off → no bumps applied.
    bumpCompaniesGeneration();
    bumpCompaniesGeneration();
    expect(currentCompaniesGeneration()).toBe(0);
  });

  it("bumpCompaniesGeneration increments when writes flag enabled", () => {
    vi.stubEnv("COMPANIES_P2_WRITES_ENABLED", "true");
    expect(currentCompaniesGeneration()).toBe(0);
    bumpCompaniesGeneration();
    expect(currentCompaniesGeneration()).toBe(1);
    bumpCompaniesGeneration();
    bumpCompaniesGeneration();
    expect(currentCompaniesGeneration()).toBe(3);
  });
});
