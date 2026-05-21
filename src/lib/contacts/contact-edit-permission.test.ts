import { describe, expect, it } from "vitest";
import { canEditContactRecord } from "@/lib/contacts/contact-edit-permission";

const OWNER = "10000000-0000-4000-8000-000000000001";
const OTHER = "10000000-0000-4000-8000-000000000002";

describe("canEditContactRecord", () => {
  it("denies when viewer is null", () => {
    expect(canEditContactRecord({ user_id: OWNER }, null)).toBe(false);
  });

  it("allows admin regardless of owner", () => {
    expect(canEditContactRecord({ user_id: OWNER }, { id: OTHER, roles: ["admin"] })).toBe(true);
    expect(canEditContactRecord({ user_id: null }, { id: OTHER, roles: ["admin"] })).toBe(true);
  });

  it("allows admin when admin is in roles but primary profile role is user", () => {
    expect(
      canEditContactRecord({ user_id: OWNER }, { id: OTHER, roles: ["user", "admin"] }),
    ).toBe(true);
  });

  it("allows non-admin when user_id matches viewer", () => {
    expect(canEditContactRecord({ user_id: OWNER }, { id: OWNER, roles: ["user"] })).toBe(true);
  });

  it("denies non-admin when user_id differs", () => {
    expect(canEditContactRecord({ user_id: OWNER }, { id: OTHER, roles: ["user"] })).toBe(false);
  });

  it("denies non-admin when user_id is null or empty", () => {
    expect(canEditContactRecord({ user_id: null }, { id: OWNER, roles: ["user"] })).toBe(false);
    expect(canEditContactRecord({ user_id: "" }, { id: OWNER, roles: ["user"] })).toBe(false);
  });
});
