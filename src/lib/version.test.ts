import { afterEach, describe, expect, it, vi } from "vitest";
import { APP_VERSION } from "./version";

describe("APP_VERSION", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is a non-empty semver-like string", () => {
    expect(typeof APP_VERSION).toBe("string");
    expect(APP_VERSION.length).toBeGreaterThan(0);
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("prefers NEXT_PUBLIC_APP_VERSION when set", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_APP_VERSION", "9.8.7");
    const { APP_VERSION: v } = await import("./version");
    expect(v).toBe("9.8.7");
  });
});
