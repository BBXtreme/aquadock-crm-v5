/** Route handler tests run in Node environment. */
// @vitest-environment node

import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockEnforceRateLimit = vi.hoisted(() =>
  vi.fn(() => ({ allowed: true, retryAfterSeconds: 60 })),
);
const mockSendEmail = vi.hoisted(() => vi.fn());

vi.mock("@/lib/security/simple-rate-limit", () => ({
  enforceSimpleRateLimit: mockEnforceRateLimit,
  getRequestIpAddress: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/services/smtp-delivery", () => ({
  sendNotificationHtmlEmail: mockSendEmail,
}));

vi.mock("@/lib/standortanalyse/persistence", () => ({
  toStandortanalyseUpdate: vi.fn(() => ({
    recommendation: "Guter Standort",
    total_points: 77,
  })),
  toStandortanalyseScoresInsert: vi.fn(() => [
    {
      analysis_id: "analysis-1",
      criterion_key: "standortfrequentierung",
      criterion_type: "main",
      points: 25,
      max_points: 25,
      status: "Gut",
      is_unknown: false,
    },
  ]),
}));

vi.mock("@/lib/standortanalyse/scoring", () => ({
  calculateStandortScore: vi.fn(() => ({
    totalPoints: 77,
    maxPoints: 135,
    totalPercent: 57,
    unknownCount: 0,
    recommendation: { label: "Guter Standort", tone: "yellow" },
    criterionEvaluations: [],
    mainCriteriaChart: [],
  })),
}));

vi.mock("@/lib/standortanalyse/share", () => ({
  hashShareToken: vi.fn(() => "token-hash"),
  verifySharePassword: vi.fn(() => true),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { toStandortanalyseScoresInsert } from "@/lib/standortanalyse/persistence";
import { verifySharePassword } from "@/lib/standortanalyse/share";
import { createAdminClient } from "@/lib/supabase/admin";
import { POST } from "./route";

const validFormData = {
  kontakt: {
    name: "Mustermann",
    vorname: "Max",
    email: "max@example.com",
    strasse: "",
    plz: "",
    ort: "",
    telefon: "",
    firma: "Marina GmbH",
  },
  standort: {
    plz: "10115",
    ort: "Berlin",
    strasse: "",
    land: "DE",
    datum: "2026-05-18",
    erstelltVon: "",
  },
  kriterien: {
    gewaesserart: "See",
    standortfrequentierung: 25,
    gastronomie: 10,
    bekanntheit: 15,
    zugaenglichkeit: 10,
    saisonlaenge: 10,
    wassertemperatur: 5,
    sonnenstunden: 5,
    einwohner: 10,
    besucherstatistiken: 5,
    attraktivitaet: 12,
    wettbewerb: 5,
    wasserzugang: 5,
    genehmigungslage: 5,
    sichtbarkeit: 5,
    erweiterbarkeit: 3,
    lokalerPartner: 2,
    marketingpotenzial: 3,
  },
  notizen: "",
};

type ShareLinkRow = {
  id: string;
  analysis_id: string;
  password_hash: string | null;
  expires_at: string;
  max_uses: number;
  used_count: number;
  is_active: boolean;
  standortanalysen: { user_id: string } | null;
};

type MockAdminOptions = {
  shareLink?: Partial<ShareLinkRow> | null;
  shareLookupError?: { message: string } | null;
  analysisUpdateError?: { message: string } | null;
  deleteScoresError?: { message: string } | null;
  insertScoresError?: { message: string } | null;
  updateShareError?: { message: string } | null;
  linkAnalysisError?: { message: string } | null;
  existingContact?: { id: string; company_id: string | null } | null;
  existingCompanyId?: string | null;
  contactLookupError?: { message: string } | null;
  contactInsertError?: { message: string } | null;
  contactUpdateError?: { message: string } | null;
  companyLookupError?: { message: string } | null;
  companyInsertError?: { message: string } | null;
  companyUpdateError?: { message: string } | null;
  ownerEmail?: string | null;
  scoreRows?: ReturnType<typeof toStandortanalyseScoresInsert>;
};

function makeSubmitRequest(body: unknown): Request {
  return new Request("http://localhost/api/standortanalyse/share/token-1/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function defaultShareLink(overrides?: Partial<ShareLinkRow>): ShareLinkRow {
  return {
    id: "share-1",
    analysis_id: "analysis-1",
    password_hash: null,
    expires_at: "2099-01-01T00:00:00.000Z",
    max_uses: 2,
    used_count: 0,
    is_active: true,
    standortanalysen: { user_id: "owner-1" },
    ...overrides,
  };
}

function mockAdminClient(options: MockAdminOptions = {}) {
  const shareLink =
    options.shareLink === null
      ? null
      : defaultShareLink(options.shareLink === undefined ? undefined : options.shareLink);

  createAdminClientMock.mockReturnValue({
    from: vi.fn((table: string) => {
      if (table === "standortanalyse_share_links") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: shareLink,
                error: options.shareLookupError ?? null,
              }),
            }),
          }),
          update: () => ({
            eq: async () => ({ error: options.updateShareError ?? null }),
          }),
        };
      }

      if (table === "standortanalysen") {
        return {
          update: () => ({
            eq: async () => ({ error: options.analysisUpdateError ?? null }),
          }),
        };
      }

      if (table === "standortanalyse_scores") {
        return {
          delete: () => ({
            eq: async () => ({ error: options.deleteScoresError ?? null }),
          }),
          insert: async () => ({ error: options.insertScoresError ?? null }),
        };
      }

      if (table === "contacts") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                is: () => ({
                  maybeSingle: async () => ({
                    data: options.existingContact ?? null,
                    error: options.contactLookupError ?? null,
                  }),
                }),
              }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: options.contactInsertError ? null : { id: "contact-1" },
                error: options.contactInsertError ?? null,
              }),
            }),
          }),
          update: () => ({
            eq: async () => ({ error: options.contactUpdateError ?? null }),
          }),
        };
      }

      if (table === "companies") {
        const existingId = options.existingCompanyId ?? null;
        return {
          select: () => ({
            eq: () => ({
              ilike: () => ({
                is: () => ({
                  order: () => ({
                    limit: async () => ({
                      data: existingId == null ? [] : [{ id: existingId }],
                      error: options.companyLookupError ?? null,
                    }),
                  }),
                }),
              }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: options.companyInsertError ? null : { id: "company-1" },
                error: options.companyInsertError ?? null,
              }),
            }),
          }),
          update: () => ({
            eq: async () => ({ error: options.companyUpdateError ?? null }),
          }),
        };
      }

      return {};
    }),
    auth: {
      admin: {
        getUserById: async () => ({
          data: {
            user:
              options.ownerEmail === null
                ? { email: null }
                : { email: options.ownerEmail ?? "owner@example.com" },
          },
        }),
      },
    },
  });
}

const createAdminClientMock = createAdminClient as Mock;
const verifySharePasswordMock = verifySharePassword as Mock;
const toScoresInsertMock = toStandortanalyseScoresInsert as Mock;

describe("POST /api/standortanalyse/share/[token]/submit", () => {
  beforeEach(() => {
    createAdminClientMock.mockReset();
    verifySharePasswordMock.mockReset();
    verifySharePasswordMock.mockReturnValue(true);
    mockEnforceRateLimit.mockReset();
    mockEnforceRateLimit.mockReturnValue({ allowed: true, retryAfterSeconds: 60 });
    mockSendEmail.mockReset();
    mockSendEmail.mockResolvedValue(undefined);
    toScoresInsertMock.mockReturnValue([
      {
        analysis_id: "analysis-1",
        criterion_key: "standortfrequentierung",
        criterion_type: "main",
        points: 25,
        max_points: 25,
        status: "Gut",
        is_unknown: false,
      },
    ]);
  });

  it("returns success without exposing score payload", async () => {
    mockAdminClient();

    const response = await POST(
      makeSubmitRequest({
        createOrUpdateContact: false,
        formData: validFormData,
      }),
      { params: Promise.resolve({ token: "token-1" }) },
    );

    const payload = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.analysisId).toBe("analysis-1");
    expect("score" in payload).toBe(false);
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
  });

  it("rejects requests with wrong share password", async () => {
    mockAdminClient({ shareLink: { password_hash: "salted-hash" } });
    verifySharePasswordMock.mockReturnValue(false);

    const response = await POST(
      makeSubmitRequest({
        password: "wrong",
        createOrUpdateContact: false,
        formData: validFormData,
      }),
      { params: Promise.resolve({ token: "token-1" }) },
    );

    const payload = (await response.json()) as { error?: string };
    expect(response.status).toBe(401);
    expect(payload.error).toMatch(/Passwort/i);
  });

  it("returns 429 when rate limited", async () => {
    mockEnforceRateLimit.mockReturnValue({ allowed: false, retryAfterSeconds: 42 });
    mockAdminClient();

    const response = await POST(makeSubmitRequest({ formData: validFormData }), {
      params: Promise.resolve({ token: "token-1" }),
    });

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("42");
  });

  it("returns 400 for invalid JSON", async () => {
    mockAdminClient();
    const response = await POST(
      new Request("http://localhost/api/standortanalyse/share/t/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not-json",
      }),
      { params: Promise.resolve({ token: "token-1" }) },
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid request body", async () => {
    mockAdminClient();
    const response = await POST(
      makeSubmitRequest({ formData: { ...validFormData, kontakt: { email: "bad" } } }),
      { params: Promise.resolve({ token: "token-1" }) },
    );
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toBe("Ungültiger Request-Body");
  });

  it("returns 404 when share link is missing", async () => {
    mockAdminClient({ shareLink: null });
    const response = await POST(makeSubmitRequest({ formData: validFormData }), {
      params: Promise.resolve({ token: "token-1" }),
    });
    expect(response.status).toBe(404);
  });

  it("returns 404 when share lookup fails", async () => {
    mockAdminClient({ shareLink: null, shareLookupError: { message: "db down" } });
    const response = await POST(makeSubmitRequest({ formData: validFormData }), {
      params: Promise.resolve({ token: "token-1" }),
    });
    expect(response.status).toBe(404);
  });

  it("returns 410 when share link is inactive", async () => {
    mockAdminClient({ shareLink: { is_active: false } });
    const response = await POST(makeSubmitRequest({ formData: validFormData }), {
      params: Promise.resolve({ token: "token-1" }),
    });
    expect(response.status).toBe(410);
  });

  it("returns 410 when share link is expired", async () => {
    mockAdminClient({ shareLink: { expires_at: "2000-01-01T00:00:00.000Z" } });
    const response = await POST(makeSubmitRequest({ formData: validFormData }), {
      params: Promise.resolve({ token: "token-1" }),
    });
    expect(response.status).toBe(410);
  });

  it("returns 410 when max uses reached", async () => {
    mockAdminClient({ shareLink: { max_uses: 1, used_count: 1 } });
    const response = await POST(makeSubmitRequest({ formData: validFormData }), {
      params: Promise.resolve({ token: "token-1" }),
    });
    expect(response.status).toBe(410);
  });

  it("returns 401 when password is required but missing", async () => {
    mockAdminClient({ shareLink: { password_hash: "hash" } });
    verifySharePasswordMock.mockReturnValue(false);

    const response = await POST(
      makeSubmitRequest({ createOrUpdateContact: false, formData: validFormData }),
      { params: Promise.resolve({ token: "token-1" }) },
    );
    expect(response.status).toBe(401);
  });

  it("returns 500 when owner user id is missing", async () => {
    mockAdminClient({ shareLink: { standortanalysen: null } });
    const response = await POST(makeSubmitRequest({ formData: validFormData }), {
      params: Promise.resolve({ token: "token-1" }),
    });
    expect(response.status).toBe(500);
  });

  it("returns 500 when analysis update fails", async () => {
    mockAdminClient({ analysisUpdateError: { message: "update failed" } });
    const response = await POST(makeSubmitRequest({ formData: validFormData }), {
      params: Promise.resolve({ token: "token-1" }),
    });
    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe("update failed");
  });

  it("returns 500 when score delete fails", async () => {
    mockAdminClient({ deleteScoresError: { message: "delete failed" } });
    const response = await POST(makeSubmitRequest({ formData: validFormData }), {
      params: Promise.resolve({ token: "token-1" }),
    });
    expect(response.status).toBe(500);
  });

  it("returns 500 when score insert fails", async () => {
    mockAdminClient({ insertScoresError: { message: "insert failed" } });
    const response = await POST(makeSubmitRequest({ formData: validFormData }), {
      params: Promise.resolve({ token: "token-1" }),
    });
    expect(response.status).toBe(500);
  });

  it("returns 500 when share link update fails", async () => {
    mockAdminClient({ updateShareError: { message: "share update failed" } });
    const response = await POST(makeSubmitRequest({ formData: validFormData }), {
      params: Promise.resolve({ token: "token-1" }),
    });
    expect(response.status).toBe(500);
  });

  it("skips score insert when there are no score rows", async () => {
    toScoresInsertMock.mockReturnValue([]);
    mockAdminClient();

    const response = await POST(makeSubmitRequest({ formData: validFormData }), {
      params: Promise.resolve({ token: "token-1" }),
    });
    expect(response.status).toBe(200);
  });

  it("syncs CRM entities when createOrUpdateContact is true", async () => {
    mockAdminClient({ existingContact: null, existingCompanyId: null });

    const response = await POST(
      makeSubmitRequest({
        createOrUpdateContact: true,
        formData: validFormData,
      }),
      { params: Promise.resolve({ token: "token-1" }) },
    );

    expect(response.status).toBe(200);
  });

  it("updates existing contact and company when CRM sync is enabled", async () => {
    mockAdminClient({
      existingContact: { id: "contact-existing", company_id: "company-existing" },
      existingCompanyId: "company-existing",
    });

    const response = await POST(
      makeSubmitRequest({
        createOrUpdateContact: true,
        formData: validFormData,
      }),
      { params: Promise.resolve({ token: "token-1" }) },
    );

    expect(response.status).toBe(200);
  });

  it("skips company creation when firma is empty", async () => {
    mockAdminClient();
    const formWithoutCompany = {
      ...validFormData,
      kontakt: { ...validFormData.kontakt, firma: "" },
    };

    const response = await POST(
      makeSubmitRequest({
        createOrUpdateContact: true,
        formData: formWithoutCompany,
      }),
      { params: Promise.resolve({ token: "token-1" }) },
    );

    expect(response.status).toBe(200);
  });

  it("sends only confirmation email when owner email is missing", async () => {
    mockAdminClient({ ownerEmail: null });

    const response = await POST(makeSubmitRequest({ formData: validFormData }), {
      params: Promise.resolve({ token: "token-1" }),
    });

    expect(response.status).toBe(200);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

});
