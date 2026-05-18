import { describe, expect, it } from "vitest";
import { generateShareToken, hashSharePassword, hashShareToken, verifySharePassword } from "./share";

describe("standortanalyse/share", () => {
  it("generates non-empty base64url tokens", () => {
    const token = generateShareToken();
    expect(token.length).toBeGreaterThan(20);
    expect(/^[A-Za-z0-9_-]+$/.test(token)).toBe(true);
  });

  it("hashes token deterministically", () => {
    const token = "standort-test-token";
    expect(hashShareToken(token)).toBe(hashShareToken(token));
  });

  it("verifies password hash and rejects wrong password", () => {
    const saltedHash = hashSharePassword("super-secret-123");
    expect(verifySharePassword("super-secret-123", saltedHash)).toBe(true);
    expect(verifySharePassword("wrong-password", saltedHash)).toBe(false);
  });

  it("rejects invalid salted hash format", () => {
    expect(verifySharePassword("pw", "invalid-format")).toBe(false);
  });
});
