import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bumpCompaniesGeneration,
  COMPANIES_SEARCH_DEFAULTS,
  currentCompaniesGeneration,
  isPerfLogsEnabled,
  logCompaniesPerf,
  logPhase1Perf,
  resetCompaniesGenerationForTests,
} from "./companies-hot-path";

describe("companies-hot-path", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("COMPANIES_PERF_LOGS_ENABLED", "");
    resetCompaniesGenerationForTests();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetCompaniesGenerationForTests();
  });

  it("defaults perf logs off in test when env unset", () => {
    expect(isPerfLogsEnabled()).toBe(false);
  });

  it("enables perf logs when COMPANIES_PERF_LOGS_ENABLED is true", () => {
    vi.stubEnv("COMPANIES_PERF_LOGS_ENABLED", "true");
    expect(isPerfLogsEnabled()).toBe(true);
  });

  it("defaults perf logs on in development when env unset", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(isPerfLogsEnabled()).toBe(true);
  });

  it("logPhase1Perf is a no-op when perf logs disabled", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    logPhase1Perf("test", { ok: true });
    expect(info).not.toHaveBeenCalled();
    info.mockRestore();
  });

  it("logPhase1Perf writes [companies-p1] when perf logs enabled", () => {
    vi.stubEnv("COMPANIES_PERF_LOGS_ENABLED", "true");
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    logPhase1Perf("latency", { ms: 12 });
    expect(info).toHaveBeenCalledWith("[companies-p1] latency", { ms: 12 });
    info.mockRestore();
  });

  it("logCompaniesPerf writes phase-tagged prefix when perf logs enabled", () => {
    vi.stubEnv("COMPANIES_PERF_LOGS_ENABLED", "true");
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    logCompaniesPerf("p2", "phase_b", { ms: 22 });
    expect(info).toHaveBeenCalledWith("[companies-p2] phase_b", { ms: 22 });
    info.mockRestore();
  });

  it("exposes pinned search defaults", () => {
    expect(COMPANIES_SEARCH_DEFAULTS.lexicalFastpathMinQueryLength).toBe(3);
    expect(COMPANIES_SEARCH_DEFAULTS.embedCacheTtlMs).toBeGreaterThan(0);
  });

  it("bumpCompaniesGeneration always increments", () => {
    expect(currentCompaniesGeneration()).toBe(0);
    bumpCompaniesGeneration();
    expect(currentCompaniesGeneration()).toBe(1);
    bumpCompaniesGeneration();
    expect(currentCompaniesGeneration()).toBe(2);
  });
});
