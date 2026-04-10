import { afterEach, describe, expect, it } from "vitest";
import { getAuthRecoveryRedirectUrl, getPublicSiteUrl } from "./site-url";

const envKeys = ["NEXT_PUBLIC_SITE_URL", "VERCEL_URL"] as const;

const siteUrlKeys = [...envKeys, "SITE_URL"] as const;

describe("getPublicSiteUrl", () => {
  afterEach(() => {
    for (const key of siteUrlKeys) {
      delete process.env[key];
    }
  });

  it("prefers SITE_URL over NEXT_PUBLIC_SITE_URL", () => {
    process.env.SITE_URL = "https://prod.example.com";
    process.env.NEXT_PUBLIC_SITE_URL = "https://wrong.example.com";
    expect(getPublicSiteUrl()).toBe("https://prod.example.com");
  });

  it("prefers NEXT_PUBLIC_SITE_URL and strips trailing slash", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://crm.example.com/";
    expect(getPublicSiteUrl()).toBe("https://crm.example.com");
  });

  it("prepends https when NEXT_PUBLIC_SITE_URL is a bare hostname", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "crm.aquadock.de";
    expect(getPublicSiteUrl()).toBe("https://crm.aquadock.de");
  });

  it("preserves http when explicitly set", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000/";
    expect(getPublicSiteUrl()).toBe("http://localhost:3000");
  });

  it("uses https://VERCEL_URL when NEXT_PUBLIC_SITE_URL is unset", () => {
    process.env.VERCEL_URL = "app-abc123.vercel.app";
    expect(getPublicSiteUrl()).toBe("https://app-abc123.vercel.app");
  });

  it("keeps protocol when VERCEL_URL already includes one", () => {
    process.env.VERCEL_URL = "https://preview.example.com";
    expect(getPublicSiteUrl()).toBe("https://preview.example.com");
  });

  it("defaults to localhost when no env is set", () => {
    expect(getPublicSiteUrl()).toBe("http://localhost:3000");
  });
});

describe("getAuthRecoveryRedirectUrl", () => {
  afterEach(() => {
    for (const key of siteUrlKeys) {
      delete process.env[key];
    }
  });

  it("appends /login to public site URL", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://app.example.com";
    expect(getAuthRecoveryRedirectUrl()).toBe("https://app.example.com/login");
  });

  it("uses https and /login for bare production hostname", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "crm.aquadock.de";
    expect(getAuthRecoveryRedirectUrl()).toBe("https://crm.aquadock.de/login");
  });
});
