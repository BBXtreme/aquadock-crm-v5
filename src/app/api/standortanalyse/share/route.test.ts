/** Route handler tests run in Node environment. */
// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateServer = vi.hoisted(() => vi.fn());
const mockCreateAdmin = vi.hoisted(() => vi.fn());
const mockSendEmail = vi.hoisted(() => vi.fn());
const mockGetSmtp = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: () => mockCreateServer(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mockCreateAdmin(),
}));

vi.mock("@/lib/services/smtp-delivery", () => ({
  getSystemSmtpConfigForNotifications: (...args: unknown[]) => mockGetSmtp(...args),
  sendNotificationHtmlEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

vi.mock("@/lib/standortanalyse/share", () => ({
  generateShareToken: vi.fn(() => "plain-token"),
  hashShareToken: vi.fn(() => "token-hash"),
  hashSharePassword: vi.fn(() => "password-hash"),
}));

import { POST } from "./route";

const USER_ID = "10000000-0000-4000-8000-000000000001";
const ANALYSIS_ID = "20000000-0000-4000-8000-000000000002";

function makePostRequest(body: unknown): Request {
  return new Request("http://localhost/api/standortanalyse/share", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockAuthenticatedClients() {
  mockCreateServer.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: USER_ID, email: "berater@example.com" } },
        error: null,
      }),
    },
  });

  mockCreateAdmin.mockReturnValue({
    from: vi.fn((table: string) => {
      if (table === "standortanalysen") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: ANALYSIS_ID, user_id: USER_ID },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "standortanalyse_share_links") {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    }),
  });
}

describe("POST /api/standortanalyse/share", () => {
  beforeEach(() => {
    mockCreateServer.mockReset();
    mockCreateAdmin.mockReset();
    mockSendEmail.mockReset();
    mockGetSmtp.mockReset();
    mockGetSmtp.mockResolvedValue({ host: "smtp.example", port: 587, user: "u", password: "p" });
    mockSendEmail.mockResolvedValue(undefined);
  });

  it("returns 400 when sendInviteEmail is true without recipientEmail", async () => {
    mockAuthenticatedClients();

    const res = await POST(
      makePostRequest({
        analysisId: ANALYSIS_ID,
        sendInviteEmail: true,
      }),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid request body");
  });

  it("sends invite email when requested", async () => {
    mockAuthenticatedClients();

    const res = await POST(
      makePostRequest({
        analysisId: ANALYSIS_ID,
        sendInviteEmail: true,
        recipientEmail: "kunde@beispiel.de",
        recipientName: "Max Mustermann",
        expiresInHours: 24,
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.emailSent).toBe(true);
    expect(body.emailError).toBeNull();
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail.mock.calls[0]?.[0]).toMatchObject({
      to: ["kunde@beispiel.de"],
      actingAdminUserId: USER_ID,
    });
  });

  it("creates link but reports smtp missing when email cannot be sent", async () => {
    mockAuthenticatedClients();
    mockGetSmtp.mockResolvedValue(null);

    const res = await POST(
      makePostRequest({
        analysisId: ANALYSIS_ID,
        sendInviteEmail: true,
        recipientEmail: "kunde@beispiel.de",
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.shareUrl).toContain("/standortanalyse/share/plain-token");
    expect(body.emailSent).toBe(false);
    expect(body.emailError).toContain("SMTP");
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
