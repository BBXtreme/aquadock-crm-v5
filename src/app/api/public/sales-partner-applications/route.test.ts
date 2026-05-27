/** Route handler tests run in Node environment. */
// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockEnforceRateLimit = vi.hoisted(() =>
  vi.fn(() => ({ allowed: true, retryAfterSeconds: 60 })),
);
const mockSendEmail = vi.hoisted(() => vi.fn());
const mockInsert = vi.hoisted(() =>
  vi.fn(async (): Promise<{ id: string; cvStoragePath: string | null }> => ({
    id: "00000000-0000-4000-8000-000000000001",
    cvStoragePath: null,
  })),
);
const mockDuplicate = vi.hoisted(() => vi.fn(async () => false));
const mockCvDownload = vi.hoisted(() => vi.fn(async () => "https://signed.example/cv.pdf"));
const mockVerifyToken = vi.hoisted(() =>
  vi.fn((token: string) =>
    token === "valid-token"
      ? { storagePath: "tmp/abc/cv.pdf" }
      : null,
  ),
);
const mockCvExists = vi.hoisted(() => vi.fn(async () => true));

vi.mock("@/lib/security/simple-rate-limit", () => ({
  enforceSimpleRateLimit: mockEnforceRateLimit,
  getRequestIpAddress: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/services/smtp-delivery", () => ({
  sendNotificationHtmlEmail: mockSendEmail,
}));

vi.mock("@/lib/partner-applications/persistence", () => ({
  findDuplicateActiveApplication: mockDuplicate,
  insertPartnerApplication: mockInsert,
  formatApplicationReferenceId: (id: string) => id.slice(0, 8).toUpperCase(),
}));

vi.mock("@/lib/partner-applications/storage", () => ({
  isValidCvStoragePath: vi.fn((p: string) => p.startsWith("tmp/") || p.startsWith("applications/")),
  cvObjectExists: mockCvExists,
  createCvDownloadSignedUrl: mockCvDownload,
}));

vi.mock("@/lib/partner-applications/upload-token", () => ({
  verifyCvUploadToken: mockVerifyToken,
}));

import { POST } from "./route";

const validBody = {
  locale: "de",
  firstName: "Max",
  lastName: "Mustermann",
  email: "max@example.com",
  phone: "+491511234567",
  countryCode: "DE",
  cityRegion: "Frankfurt",
  proposedTerritory: "Hessen, Rhein-Main",
  yearsSalesExperience: 5,
  industryExperience: ["b2b_sales", "tourism"],
  motivation: "Ich möchte AquaDock in meiner Region aktiv vertreiben und kenne viele Hotelkontakte.",
  handelsvertreterAck: true,
  gdprConsent: true,
  cvUploadToken: "valid-token",
};

function makeRequest(body: unknown, origin = "http://localhost:3000") {
  return new Request("http://localhost/api/public/sales-partner-applications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/public/sales-partner-applications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnforceRateLimit.mockReturnValue({ allowed: true, retryAfterSeconds: 60 });
    mockDuplicate.mockResolvedValue(false);
    mockCvExists.mockResolvedValue(true);
    mockVerifyToken.mockImplementation((token: string) =>
      token === "valid-token" ? { storagePath: "tmp/abc/cv.pdf" } : null,
    );
    mockInsert.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000001",
      cvStoragePath: "applications/00000000-0000-4000-8000-000000000001/cv.pdf",
    });
  });

  it("returns 400 for invalid body", async () => {
    const res = await POST(makeRequest({ locale: "de" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("validation_error");
  });

  it("returns 409 for duplicate application", async () => {
    mockDuplicate.mockResolvedValueOnce(true);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe("duplicate_application");
  });

  it("returns 200 and sends emails on success", async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.applicationId).toBeTruthy();
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        cvStoragePath: "tmp/abc/cv.pdf",
      }),
    );
  });

  it("returns silent ok for honeypot", async () => {
    const res = await POST(makeRequest({ ...validBody, hp: "bot" }));
    expect(res.status).toBe(200);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns 403 for disallowed origin", async () => {
    const res = await POST(makeRequest(validBody, "https://evil.example"));
    expect(res.status).toBe(403);
  });

  it("returns 403 when origin header is missing", async () => {
    const res = await POST(
      new Request("http://localhost/api/public/sales-partner-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validBody),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid cv token", async () => {
    const res = await POST(makeRequest({ ...validBody, cvUploadToken: "invalid-token-value" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("cv_invalid");
  });

  it("returns 400 when cv file was not uploaded", async () => {
    mockCvExists.mockResolvedValueOnce(false);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("cv_not_uploaded");
  });
});
