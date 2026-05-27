/** Route handler tests run in Node environment. */
// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockEnforceRateLimit = vi.hoisted(() =>
  vi.fn(() => ({ allowed: true, retryAfterSeconds: 60 })),
);
const mockUpload = vi.hoisted(() => vi.fn(async () => ({ error: null })));
const mockCreateToken = vi.hoisted(() => vi.fn(() => "signed-cv-token"));

vi.mock("@/lib/security/simple-rate-limit", () => ({
  enforceSimpleRateLimit: mockEnforceRateLimit,
  getRequestIpAddress: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/partner-applications/upload-token", () => ({
  createCvUploadToken: mockCreateToken,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: {
      from: () => ({
        upload: mockUpload,
      }),
    },
  }),
}));

import { POST } from "./route";

function makePdfFile(size = 128): File {
  return new File([new Uint8Array(size).fill(0x25)], "cv.pdf", { type: "application/pdf" });
}

describe("POST /api/public/sales-partner-applications/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads file via service role and returns cvUploadToken", async () => {
    const form = new FormData();
    form.set("file", makePdfFile());

    const res = await POST(
      new Request("http://localhost/api/public/sales-partner-applications/upload", {
        method: "POST",
        headers: { Origin: "http://localhost:3000" },
        body: form,
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.cvUploadToken).toBe("signed-cv-token");
    expect(mockUpload).toHaveBeenCalledTimes(1);
  });

  it("returns 400 for missing file", async () => {
    const res = await POST(
      new Request("http://localhost/api/public/sales-partner-applications/upload", {
        method: "POST",
        headers: { Origin: "http://localhost:3000" },
        body: new FormData(),
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("file_required");
  });
});
