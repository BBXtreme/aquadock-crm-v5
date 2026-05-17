import { describe, expect, it } from "vitest";

import {
  DEFAULT_LANDING_PATH,
  PARTNER_LANDING_PATH,
  resolvePostLoginRedirect,
  sanitizeRedirectTo,
} from "./post-login-redirect";

describe("sanitizeRedirectTo", () => {
  it("accepts a relative path starting with /", () => {
    expect(sanitizeRedirectTo("/dashboard")).toBe("/dashboard");
    expect(sanitizeRedirectTo("/partner/dashboard")).toBe("/partner/dashboard");
  });

  it("rejects absolute, protocol-relative, and traversal paths", () => {
    expect(sanitizeRedirectTo("https://evil.com")).toBeNull();
    expect(sanitizeRedirectTo("//evil.com")).toBeNull();
    expect(sanitizeRedirectTo("../etc/passwd")).toBeNull();
    expect(sanitizeRedirectTo("/legit/../etc/passwd")).toBeNull();
  });

  it("rejects empty, whitespace, and non-string values", () => {
    expect(sanitizeRedirectTo("")).toBeNull();
    expect(sanitizeRedirectTo("   ")).toBeNull();
    expect(sanitizeRedirectTo(null)).toBeNull();
    expect(sanitizeRedirectTo(undefined)).toBeNull();
  });
});

describe("resolvePostLoginRedirect", () => {
  it("prefers partner landing for partner-only users", () => {
    expect(resolvePostLoginRedirect({ roles: ["partner"] })).toBe(
      PARTNER_LANDING_PATH,
    );
  });

  it("prefers partner over admin when both roles are present", () => {
    expect(resolvePostLoginRedirect({ roles: ["admin", "partner"] })).toBe(
      PARTNER_LANDING_PATH,
    );
  });

  it("falls back to /dashboard for internal-only users", () => {
    expect(resolvePostLoginRedirect({ roles: ["admin"] })).toBe(
      DEFAULT_LANDING_PATH,
    );
    expect(resolvePostLoginRedirect({ roles: ["user"] })).toBe(
      DEFAULT_LANDING_PATH,
    );
  });

  it("falls back to /dashboard when no roles are present", () => {
    expect(resolvePostLoginRedirect({ roles: [] })).toBe(DEFAULT_LANDING_PATH);
  });

  it("honors a safe redirectTo for non-partner paths", () => {
    expect(
      resolvePostLoginRedirect({
        roles: ["user"],
        redirectTo: "/companies/123",
      }),
    ).toBe("/companies/123");
  });

  it("honors a safe partner redirectTo only when role allows", () => {
    expect(
      resolvePostLoginRedirect({
        roles: ["partner"],
        redirectTo: "/partner/resources",
      }),
    ).toBe("/partner/resources");

    expect(
      resolvePostLoginRedirect({
        roles: ["admin"],
        redirectTo: "/partner/resources",
      }),
    ).toBe("/partner/resources");

    // A pure internal user should not be redirected into /partner/*; falls back to role landing.
    expect(
      resolvePostLoginRedirect({
        roles: ["user"],
        redirectTo: "/partner/resources",
      }),
    ).toBe(DEFAULT_LANDING_PATH);
  });

  it("ignores unsafe redirectTo values", () => {
    expect(
      resolvePostLoginRedirect({
        roles: ["partner"],
        redirectTo: "https://evil.com",
      }),
    ).toBe(PARTNER_LANDING_PATH);
  });
});
