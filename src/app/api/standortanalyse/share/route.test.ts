/** Route handler tests run in Node environment. */
// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateServer = vi.hoisted(() => vi.fn());
const mockCreateAdmin = vi.hoisted(() => vi.fn());
const mockSendEmail = vi.hoisted(() => vi.fn());
const mockGetSmtp = vi.hoisted(() => vi.fn());
const mockCreateInviteDraft = vi.hoisted(() => vi.fn());

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

vi.mock("@/lib/standortanalyse/persistence", () => ({
  createInviteDraftPayload: (...args: unknown[]) => mockCreateInviteDraft(...args),
}));

import { GET, POST } from "./route";

const USER_ID = "10000000-0000-4000-8000-000000000001";
const OTHER_USER_ID = "10000000-0000-4000-8000-000000000099";
const ANALYSIS_ID = "20000000-0000-4000-8000-000000000002";
const DRAFT_ID = "20000000-0000-4000-8000-000000000003";

function makePostRequest(body: unknown): Request {
  return new Request("http://localhost/api/standortanalyse/share", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(search = ""): Request {
  return new Request(`http://localhost/api/standortanalyse/share${search}`);
}

function mockAuthenticatedServer() {
  mockCreateServer.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: USER_ID, email: "berater@example.com" } },
        error: null,
      }),
    },
  });
}

function mockPostAdminClient(options?: {
  ownerId?: string;
  insertError?: { message: string } | null;
  revokeError?: { message: string } | null;
  draftInsertError?: { message: string } | null;
  draftScoreError?: { message: string } | null;
  includeDraftInsert?: boolean;
}) {
  const ownerId = options?.ownerId ?? USER_ID;

  mockCreateAdmin.mockReturnValue({
    from: vi.fn((table: string) => {
      if (table === "standortanalysen") {
        const chain = {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: ANALYSIS_ID, user_id: ownerId },
                error: null,
              }),
            }),
          }),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: options?.draftInsertError ? null : { id: DRAFT_ID },
                error: options?.draftInsertError ?? null,
              }),
            })),
          })),
        };
        return chain;
      }
      if (table === "standortanalyse_share_links") {
        return {
          insert: vi.fn().mockResolvedValue({ error: options?.insertError ?? null }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: options?.revokeError ?? null }),
            }),
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      analysis_id: ANALYSIS_ID,
                      created_at: "2026-05-18T10:00:00.000Z",
                      expires_at: "2099-01-01T00:00:00.000Z",
                      max_uses: 1,
                      used_count: 0,
                      is_active: true,
                      password_hash: "hash",
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "standortanalyse_scores") {
        return {
          insert: vi.fn().mockResolvedValue({ error: options?.draftScoreError ?? null }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    }),
  });

  if (options?.includeDraftInsert !== false) {
    mockCreateInviteDraft.mockReturnValue({
      analysisInsert: { user_id: USER_ID, status: "draft" },
      scoreRowsWithoutAnalysisId: [{ criterion_key: "standortfrequentierung", points: 1 }],
    });
  }
}

describe("GET /api/standortanalyse/share", () => {
  beforeEach(() => {
    mockCreateServer.mockReset();
    mockCreateAdmin.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });

    const res = await GET(makeGetRequest(`?analysisId=${ANALYSIS_ID}`));
    expect(res.status).toBe(401);
  });

  it("returns null lastShareLink when analysisId is missing", async () => {
    mockAuthenticatedServer();

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ lastShareLink: null });
  });

  it("returns 404 when analysis is not found", async () => {
    mockAuthenticatedServer();
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      })),
    });

    const res = await GET(makeGetRequest(`?analysisId=${ANALYSIS_ID}`));
    expect(res.status).toBe(404);
  });

  it("returns 403 when analysis belongs to another user", async () => {
    mockAuthenticatedServer();
    mockCreateAdmin.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: ANALYSIS_ID, user_id: OTHER_USER_ID },
              error: null,
            }),
          }),
        }),
      })),
    });

    const res = await GET(makeGetRequest(`?analysisId=${ANALYSIS_ID}`));
    expect(res.status).toBe(403);
  });

  it("returns lastShareLink metadata for owner", async () => {
    mockAuthenticatedServer();
    mockPostAdminClient();

    const res = await GET(makeGetRequest(`?analysisId=${ANALYSIS_ID}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.lastShareLink).toMatchObject({
      analysisId: ANALYSIS_ID,
      passwordProtected: true,
    });
  });

  it("returns null when no share link exists", async () => {
    mockAuthenticatedServer();
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
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table: ${table}`);
      }),
    });

    const res = await GET(makeGetRequest(`?analysisId=${ANALYSIS_ID}`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ lastShareLink: null });
  });

  it("returns 500 when link query fails", async () => {
    mockAuthenticatedServer();
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
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: null,
                      error: { message: "link db error" },
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected table: ${table}`);
      }),
    });

    const res = await GET(makeGetRequest(`?analysisId=${ANALYSIS_ID}`));
    expect(res.status).toBe(500);
  });
});

describe("POST /api/standortanalyse/share", () => {
  beforeEach(() => {
    mockCreateServer.mockReset();
    mockCreateAdmin.mockReset();
    mockSendEmail.mockReset();
    mockCreateInviteDraft.mockReset();
    mockGetSmtp.mockReset();
    mockGetSmtp.mockResolvedValue({ host: "smtp.example", port: 587, user: "u", password: "p" });
    mockSendEmail.mockResolvedValue(undefined);
  });

  it("returns 401 when unauthenticated", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });

    const res = await POST(makePostRequest({ analysisId: ANALYSIS_ID }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON", async () => {
    mockAuthenticatedServer();
    const res = await POST(
      new Request("http://localhost/api/standortanalyse/share", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "not-json",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when sendInviteEmail is true without recipientEmail", async () => {
    mockAuthenticatedServer();
    mockPostAdminClient();

    const res = await POST(
      makePostRequest({
        analysisId: ANALYSIS_ID,
        sendInviteEmail: true,
      }),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Ungültiger Request-Body");
  });

  it("rejects placeholder invite email addresses", async () => {
    mockAuthenticatedServer();
    mockPostAdminClient();

    const res = await POST(
      makePostRequest({
        analysisId: ANALYSIS_ID,
        sendInviteEmail: true,
        recipientEmail: "pending-123@aquadock.invalid",
      }),
    );

    expect(res.status).toBe(400);
  });

  it("sends invite email when requested", async () => {
    mockAuthenticatedServer();
    mockPostAdminClient();

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
    mockAuthenticatedServer();
    mockPostAdminClient();
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

  it("creates draft analysis when analysisId is omitted", async () => {
    mockAuthenticatedServer();
    mockPostAdminClient();

    const res = await POST(makePostRequest({ expiresInHours: 48, maxUses: 3 }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.analysisId).toBe(DRAFT_ID);
    expect(mockCreateInviteDraft).toHaveBeenCalledWith(USER_ID);
  });

  it("returns 500 when draft insert fails", async () => {
    mockAuthenticatedServer();
    mockPostAdminClient({ draftInsertError: { message: "draft failed" } });

    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(500);
  });

  it("returns 500 when draft score insert fails", async () => {
    mockAuthenticatedServer();
    mockPostAdminClient({ draftScoreError: { message: "scores failed" } });

    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(500);
  });

  it("returns 403 when analysis belongs to another user", async () => {
    mockAuthenticatedServer();
    mockPostAdminClient({ ownerId: OTHER_USER_ID });

    const res = await POST(makePostRequest({ analysisId: ANALYSIS_ID }));
    expect(res.status).toBe(403);
  });

  it("revokes older links when requested", async () => {
    mockAuthenticatedServer();
    mockPostAdminClient();

    const res = await POST(
      makePostRequest({
        analysisId: ANALYSIS_ID,
        revokeOlderLinks: true,
        password: "secret-pass",
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.passwordProtected).toBe(true);
  });

  it("returns 500 when share link insert fails", async () => {
    mockAuthenticatedServer();
    mockPostAdminClient({ insertError: { message: "insert failed" } });

    const res = await POST(makePostRequest({ analysisId: ANALYSIS_ID }));
    expect(res.status).toBe(500);
  });

  it("returns 500 when revoke older links fails", async () => {
    mockAuthenticatedServer();
    mockPostAdminClient({ revokeError: { message: "revoke failed" } });

    const res = await POST(
      makePostRequest({
        analysisId: ANALYSIS_ID,
        revokeOlderLinks: true,
      }),
    );
    expect(res.status).toBe(500);
  });

  it("reports email send failure without failing link creation", async () => {
    mockAuthenticatedServer();
    mockPostAdminClient();
    mockSendEmail.mockRejectedValue(new Error("smtp down"));

    const res = await POST(
      makePostRequest({
        analysisId: ANALYSIS_ID,
        sendInviteEmail: true,
        recipientEmail: "kunde@beispiel.de",
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.emailSent).toBe(false);
    expect(body.emailError).toContain("smtp down");
  });
});
