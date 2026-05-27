import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCvUploadToken, verifyCvUploadToken } from "./upload-token";

describe("partner application upload token", () => {
  beforeEach(() => {
    vi.stubEnv("PARTNER_APPLICATION_UPLOAD_SECRET", "test-upload-secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("round-trips a valid token", () => {
    const token = createCvUploadToken("tmp/abc/cv.pdf", Date.now() + 60_000);
    const verified = verifyCvUploadToken(token);
    expect(verified).toEqual({ storagePath: "tmp/abc/cv.pdf" });
  });

  it("rejects tampered tokens", () => {
    const token = createCvUploadToken("tmp/abc/cv.pdf", Date.now() + 60_000);
    const tampered = `${token}x`;
    expect(verifyCvUploadToken(tampered)).toBeNull();
  });

  it("rejects expired tokens", () => {
    const token = createCvUploadToken("tmp/abc/cv.pdf", Date.now() - 1);
    expect(verifyCvUploadToken(token)).toBeNull();
  });
});
