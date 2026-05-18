/** Route handler tests run in Node environment. */
// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateServer = vi.hoisted(() => vi.fn());
const mockSendEmail = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: () => mockCreateServer(),
}));

vi.mock("@/lib/services/smtp-delivery", () => ({
  sendNotificationHtmlEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

import { GET, POST } from "./route";

const USER_ID = "10000000-0000-4000-8000-000000000001";
const ANALYSIS_ID = "20000000-0000-4000-8000-000000000002";
const CONTACT_ID = "30000000-0000-4000-8000-000000000003";
const COMPANY_ID = "40000000-0000-4000-8000-000000000004";

const validFormData = {
  kontakt: {
    name: "Mustermann",
    vorname: "Max",
    email: "max@example.com",
    strasse: "Musterstr. 1",
    plz: "10115",
    ort: "Berlin",
    telefon: "+49 30 123456",
    firma: "Marina GmbH",
  },
  standort: {
    plz: "10115",
    ort: "Berlin",
    strasse: "Hafenweg 2",
    land: "DE",
    datum: "2026-05-18",
    erstelltVon: "Berater",
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

function makeGetRequest(search = ""): Request {
  return new Request(`http://localhost/api/standortanalyse${search}`);
}

function makePostRequest(body: unknown): Request {
  return new Request("http://localhost/api/standortanalyse", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function listQueryChain(
  result: { data: unknown; error: unknown },
  options?: { eq?: ReturnType<typeof vi.fn> },
) {
  const base = Promise.resolve(result);
  const eq = options?.eq ?? vi.fn();
  const chain = Object.assign(base, {
    select: vi.fn(),
    eq,
    order: vi.fn(),
  });
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  return chain;
}

function createDraftPostClient(options?: {
  insertAnalysisId?: string;
  existingCompanyId?: string | null;
  existingContactId?: string | null;
}) {
  const insertAnalysisId = options?.insertAnalysisId ?? ANALYSIS_ID;
  const existingCompanyId = options?.existingCompanyId ?? null;
  const existingContactId = options?.existingContactId ?? null;

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: USER_ID, email: "berater@example.com" } },
        error: null,
      }),
    },
    from: vi.fn((table: string) => {
      if (table === "standortanalysen") {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: insertAnalysisId },
                error: null,
              }),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          })),
        };
      }
      if (table === "standortanalyse_scores") {
        return {
          delete: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      if (table === "companies") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              ilike: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                      data: existingCompanyId == null ? [] : [{ id: existingCompanyId }],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: COMPANY_ID },
                error: null,
              }),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        };
      }
      if (table === "contacts") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data:
                      existingContactId == null
                        ? null
                        : { id: existingContactId, company_id: existingCompanyId },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: CONTACT_ID },
                error: null,
              }),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    }),
  };
}

describe("GET /api/standortanalyse", () => {
  beforeEach(() => {
    mockCreateServer.mockReset();
    mockSendEmail.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns analyses for authenticated user", async () => {
    const analyses = [
      {
        id: ANALYSIS_ID,
        status: "draft",
        created_at: "2026-05-18T10:00:00.000Z",
        updated_at: "2026-05-18T10:00:00.000Z",
        total_points: 77,
        recommendation: "Guter Standort",
        standort_ort: "Berlin",
        kontakt_name: "Max Mustermann",
        submitted_at: null,
      },
    ];
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID } },
          error: null,
        }),
      },
      from: vi.fn(() => listQueryChain({ data: analyses, error: null })),
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ analyses });
  });

  it("applies status filter when provided", async () => {
    const eq = vi.fn();
    const chain = listQueryChain({ data: [], error: null }, { eq });
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID } },
          error: null,
        }),
      },
      from: vi.fn(() => chain),
    });

    await GET(makeGetRequest("?status=submitted"));

    expect(eq).toHaveBeenCalledWith("status", "submitted");
  });

  it("returns 500 when list query fails", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID } },
          error: null,
        }),
      },
      from: vi.fn(() => listQueryChain({ data: null, error: { message: "db error" } })),
    });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "db error" });
  });
});

describe("POST /api/standortanalyse", () => {
  beforeEach(() => {
    mockCreateServer.mockReset();
    mockSendEmail.mockReset();
    mockSendEmail.mockResolvedValue(undefined);
  });

  it("returns 401 when unauthenticated", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });

    const res = await POST(makePostRequest({ formData: validFormData }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid JSON", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID } },
          error: null,
        }),
      },
    });

    const req = new Request("http://localhost/api/standortanalyse", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid JSON body" });
  });

  it("returns 400 when form data fails validation", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: USER_ID } },
          error: null,
        }),
      },
    });

    const res = await POST(
      makePostRequest({
        formData: { ...validFormData, kontakt: { ...validFormData.kontakt, email: "not-an-email" } },
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid request body");
    expect(body.issues).toBeDefined();
  });

  it("creates draft analysis and returns score", async () => {
    mockCreateServer.mockResolvedValue(createDraftPostClient());

    const res = await POST(makePostRequest({ formData: validFormData, submit: false }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.analysisId).toBe(ANALYSIS_ID);
    expect(body.status).toBe("draft");
    expect(body.score.totalPoints).toBeGreaterThan(0);
    expect(body.crm).toEqual({ contactId: null, companyId: null });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("updates existing analysis when analysisId is provided", async () => {
    const client = createDraftPostClient();
    mockCreateServer.mockResolvedValue(client);

    const res = await POST(
      makePostRequest({
        analysisId: ANALYSIS_ID,
        formData: validFormData,
        submit: false,
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      success: true,
      analysisId: ANALYSIS_ID,
      status: "draft",
    });
    const standortTable = client.from.mock.calls.find(([table]) => table === "standortanalysen");
    expect(standortTable).toBeDefined();
  });

  it("submits analysis and sends notification emails", async () => {
    mockCreateServer.mockResolvedValue(createDraftPostClient());

    const res = await POST(makePostRequest({ formData: validFormData, submit: true }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("submitted");
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
  });

  it("syncs CRM entities when syncCrmEntities is true", async () => {
    mockCreateServer.mockResolvedValue(
      createDraftPostClient({ existingCompanyId: null, existingContactId: null }),
    );

    const res = await POST(
      makePostRequest({
        formData: validFormData,
        submit: false,
        syncCrmEntities: true,
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.crm).toEqual({
      contactId: CONTACT_ID,
      companyId: COMPANY_ID,
    });
  });

  it("syncs CRM on submit with createOrUpdateContact", async () => {
    mockCreateServer.mockResolvedValue(
      createDraftPostClient({ existingCompanyId: COMPANY_ID, existingContactId: CONTACT_ID }),
    );

    const res = await POST(
      makePostRequest({
        formData: validFormData,
        submit: true,
        createOrUpdateContact: true,
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("submitted");
    expect(body.crm).toEqual({
      contactId: CONTACT_ID,
      companyId: COMPANY_ID,
    });
  });

  it("syncs only company when createOrUpdateCompany is true", async () => {
    mockCreateServer.mockResolvedValue(
      createDraftPostClient({ existingCompanyId: null, existingContactId: null }),
    );

    const res = await POST(
      makePostRequest({
        formData: validFormData,
        submit: false,
        createOrUpdateCompany: true,
        createOrUpdateContact: false,
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.crm).toEqual({
      contactId: null,
      companyId: COMPANY_ID,
    });
  });

  it("does not sync CRM on draft save without flags", async () => {
    mockCreateServer.mockResolvedValue(createDraftPostClient());

    const res = await POST(
      makePostRequest({
        formData: validFormData,
        submit: false,
        syncCrmEntities: false,
        createOrUpdateContact: false,
        createOrUpdateCompany: false,
      }),
    );

    expect(res.status).toBe(200);
    expect((await res.json()).crm).toEqual({ contactId: null, companyId: null });
  });

  it("submits without customer email when kontakt email is empty", async () => {
    mockCreateServer.mockResolvedValue(createDraftPostClient());
    const formWithoutCustomerEmail = {
      ...validFormData,
      kontakt: { ...validFormData.kontakt, email: "noreply@example.com" },
    };

    const res = await POST(
      makePostRequest({
        formData: formWithoutCustomerEmail,
        submit: true,
        createOrUpdateContact: false,
        createOrUpdateCompany: false,
      }),
    );

    expect(res.status).toBe(200);
    expect(mockSendEmail).toHaveBeenCalledTimes(2);
  });
});
