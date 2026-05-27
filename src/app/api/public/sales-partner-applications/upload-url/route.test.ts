/** Route handler tests run in Node environment. */
// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockEnforceRateLimit = vi.hoisted(() =>
  vi.fn(() => ({ allowed: true, retryAfterSeconds: 60 })),
);
const mockCreateUpload = vi.hoisted(() =>
  vi.fn(async () => ({
    uploadUrl: "https://storage.example/upload",
    cvUploadToken: "signed-upload-token",
    expiresIn: 300,
  })),
);

vi.mock("@/lib/security/simple-rate-limit", () => ({
  enforceSimpleRateLimit: mockEnforceRateLimit,
  getRequestIpAddress: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/partner-applications/storage", () => ({
  createCvUploadSignedUrl: mockCreateUpload,
}));

import { POST } from "./route";

describe("POST upload-url", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns signed upload payload with token", async () => {
    const res = await POST(
      new Request("http://localhost/api/public/sales-partner-applications/upload-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          filename: "cv.pdf",
          contentType: "application/pdf",
          fileSize: 1024,
        }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.uploadUrl).toBeTruthy();
    expect(json.cvUploadToken).toBe("signed-upload-token");
    expect(json.storagePath).toBeUndefined();
  });
});
