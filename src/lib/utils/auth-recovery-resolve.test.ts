import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockHeaders = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  headers: mockHeaders,
}));

describe("resolveAuthRecoveryRedirectUrl", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.SITE_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_URL;
    delete process.env.VERCEL_ENV;
    mockHeaders.mockReset();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("uses SITE_URL first", async () => {
    process.env.SITE_URL = "https://crm.example.com/";
    const { resolveAuthRecoveryRedirectUrl } = await import("./auth-recovery-redirect");
    await expect(resolveAuthRecoveryRedirectUrl()).resolves.toBe("https://crm.example.com/login");
  });

  it("uses NEXT_PUBLIC_SITE_URL when SITE_URL missing", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3001";
    const { resolveAuthRecoveryRedirectUrl } = await import("./auth-recovery-redirect");
    await expect(resolveAuthRecoveryRedirectUrl()).resolves.toBe("http://localhost:3001/login");
  });

  it("uses forwarded headers when env urls missing", async () => {
    mockHeaders.mockResolvedValue({
      get: (name: string) => {
        if (name === "x-forwarded-host") {
          return "app.example.com";
        }
        if (name === "x-forwarded-proto") {
          return "https";
        }
        return null;
      },
    });
    const { resolveAuthRecoveryRedirectUrl } = await import("./auth-recovery-redirect");
    await expect(resolveAuthRecoveryRedirectUrl()).resolves.toBe("https://app.example.com/login");
  });

  it("uses VERCEL_URL when no origin from headers", async () => {
    mockHeaders.mockResolvedValue({
      get: () => null,
    });
    process.env.VERCEL_URL = "my-app.vercel.app";
    const { resolveAuthRecoveryRedirectUrl } = await import("./auth-recovery-redirect");
    await expect(resolveAuthRecoveryRedirectUrl()).resolves.toBe("https://my-app.vercel.app/login");
  });

  it("uses production fallback when VERCEL_ENV production", async () => {
    mockHeaders.mockResolvedValue({ get: () => null });
    process.env.VERCEL_ENV = "production";
    const { resolveAuthRecoveryRedirectUrl } = await import("./auth-recovery-redirect");
    await expect(resolveAuthRecoveryRedirectUrl()).resolves.toBe(
      "https://aquadock-crm-glqn.vercel.app/login",
    );
  });

  it("defaults to localhost", async () => {
    mockHeaders.mockResolvedValue({ get: () => null });
    const { resolveAuthRecoveryRedirectUrl } = await import("./auth-recovery-redirect");
    await expect(resolveAuthRecoveryRedirectUrl()).resolves.toBe("http://localhost:3000/login");
  });
});
