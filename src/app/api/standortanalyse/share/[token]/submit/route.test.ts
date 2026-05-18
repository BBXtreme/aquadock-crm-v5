/** Route handler tests run in Node environment. */
// @vitest-environment node

import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/security/simple-rate-limit", () => ({
  enforceSimpleRateLimit: vi.fn(() => ({ allowed: true, retryAfterSeconds: 1 })),
  getRequestIpAddress: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/services/smtp-delivery", () => ({
  sendNotificationHtmlEmail: vi.fn(),
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
    firma: "",
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

describe("POST /api/standortanalyse/share/[token]/submit", () => {
  const createAdminClientMock = createAdminClient as Mock;
  const verifySharePasswordMock = verifySharePassword as Mock;

  beforeEach(() => {
    createAdminClientMock.mockReset();
    verifySharePasswordMock.mockReset();
    verifySharePasswordMock.mockReturnValue(true);
  });

  function mockAdminClient(args?: { passwordHash?: string | null }) {
    const shareLink = {
      id: "share-1",
      analysis_id: "analysis-1",
      password_hash: args?.passwordHash ?? null,
      expires_at: "2099-01-01T00:00:00.000Z",
      max_uses: 1,
      used_count: 0,
      is_active: true,
      standortanalysen: { user_id: "owner-1" },
    };

    createAdminClientMock.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "standortanalyse_share_links") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: shareLink, error: null }),
              }),
            }),
            update: () => ({
              eq: async () => ({ error: null }),
            }),
          };
        }

        if (table === "standortanalysen") {
          return {
            update: () => ({
              eq: async () => ({ error: null }),
            }),
          };
        }

        if (table === "standortanalyse_scores") {
          return {
            delete: () => ({
              eq: async () => ({ error: null }),
            }),
            insert: async () => ({ error: null }),
          };
        }

        if (table === "contacts") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  is: () => ({
                    maybeSingle: async () => ({ data: null, error: null }),
                  }),
                }),
              }),
            }),
            insert: () => ({
              select: () => ({
                single: async () => ({ data: { id: "contact-1" }, error: null }),
              }),
            }),
          };
        }

        if (table === "companies") {
          return {
            select: () => ({
              eq: () => ({
                ilike: () => ({
                  is: () => ({
                    order: () => ({
                      limit: async () => ({ data: [], error: null }),
                    }),
                  }),
                }),
              }),
            }),
            insert: () => ({
              select: () => ({
                single: async () => ({ data: { id: "company-1" }, error: null }),
              }),
            }),
          };
        }

        return {};
      }),
      auth: {
        admin: {
          getUserById: async () => ({ data: { user: { email: "owner@example.com" } } }),
        },
      },
    });
  }

  it("returns success without exposing score payload", async () => {
    mockAdminClient();

    const response = await POST(
      new Request("http://localhost/api/standortanalyse/share/token-1/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          createOrUpdateContact: false,
          formData: validFormData,
        }),
      }),
      { params: Promise.resolve({ token: "token-1" }) },
    );

    const payload = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.analysisId).toBe("analysis-1");
    expect("score" in payload).toBe(false);
  });

  it("rejects requests with wrong share password", async () => {
    mockAdminClient({ passwordHash: "salted-hash" });
    verifySharePasswordMock.mockReturnValue(false);

    const response = await POST(
      new Request("http://localhost/api/standortanalyse/share/token-1/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: "wrong",
          createOrUpdateContact: false,
          formData: validFormData,
        }),
      }),
      { params: Promise.resolve({ token: "token-1" }) },
    );

    const payload = (await response.json()) as { error?: string };
    expect(response.status).toBe(401);
    expect(payload.error).toMatch(/Passwort/i);
  });
});
