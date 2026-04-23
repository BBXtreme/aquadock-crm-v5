/**
 * API route handler tests: mock server Supabase, auth, and external services.
 */

import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { COMPANY_IMPORT_SOURCE_HEADER, COMPANY_IMPORT_SOURCE_OSM_POI } from "@/lib/constants/company-import-source";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.mocked(console.error).mockRestore();
});

const mockCreateServer = vi.hoisted(() => vi.fn());
const mockGetCurrentUser = vi.hoisted(() => vi.fn());
const mockCreateTimelineEntry = vi.hoisted(() => vi.fn());
const mockServiceCreateTimelineEntry = vi.hoisted(() => vi.fn());
const mockUpdateTimelineEntry = vi.hoisted(() => vi.fn());
const mockDeleteTimeline = vi.hoisted(() => vi.fn());
const mockDeleteContact = vi.hoisted(() => vi.fn());
const mockGetReminders = vi.hoisted(() => vi.fn());
const mockCreateReminder = vi.hoisted(() => vi.fn());
const mockGetUserSettings = vi.hoisted(() => vi.fn());
const mockCreateTransport = vi.hoisted(() => vi.fn());
const mockSendMail = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: () => mockCreateServer(),
}));

vi.mock("@/lib/auth/get-current-user", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

vi.mock("@/lib/server/timeline-insert", () => ({
  createAuthenticatedTimelineEntry: (...args: unknown[]) => mockCreateTimelineEntry(...args),
}));

vi.mock("@/lib/services/timeline", () => ({
  updateTimelineEntry: (...args: unknown[]) => mockUpdateTimelineEntry(...args),
  createTimelineEntry: (...args: unknown[]) => mockServiceCreateTimelineEntry(...args),
}));

vi.mock("@/lib/actions/crm-trash", () => ({
  deleteTimelineEntryWithTrash: (...args: unknown[]) => mockDeleteTimeline(...args),
  deleteContactWithTrash: (...args: unknown[]) => mockDeleteContact(...args),
}));

vi.mock("@/lib/actions/reminders", () => ({
  getReminders: (client: unknown) => mockGetReminders(client),
  createReminderAction: (body: unknown) => mockCreateReminder(body),
}));

vi.mock("@/lib/services/user-settings", () => ({
  getUserSettings: (...args: unknown[]) => mockGetUserSettings(...args),
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: (...args: unknown[]) => {
      mockCreateTransport(...args);
      return { sendMail: mockSendMail };
    },
  },
}));

import { GET as getAuthMe } from "./auth/me/route";
import { GET as getAuthUser } from "./auth/user/route";
import { POST as postCompanies } from "./companies/route";
import { DELETE as deleteContact, GET as getContact, PUT as putContact } from "./contacts/[id]/route";
import { GET as getRemindersRoute, POST as postRemindersRoute } from "./reminders/route";
import { POST as postSendTestEmail } from "./send-test-email/route";
import { POST as postTestSmtp } from "./test-smtp/route";
import { DELETE as deleteTimelineId, PUT as putTimelineId } from "./timeline/[id]/route";
import { POST as postTimeline } from "./timeline/route";

function jsonRequest(body: unknown): NextRequest {
  return new Request("http://localhost/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

const mockAuthedUser = { id: "u1" } as const;

function mockServerClientWithUser(client: { auth?: unknown; from: () => unknown }) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: mockAuthedUser }, error: null }),
    },
    ...client,
  };
}

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    mockGetCurrentUser.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await getAuthMe();
    expect(res.status).toBe(401);
  });

  it("returns user json when authenticated", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "u1",
      email: "a@b.co",
      role: "admin",
      display_name: "Admin",
    });
    const res = await getAuthMe();
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.id).toBe("u1");
    expect(body.email).toBe("a@b.co");
  });
});

describe("GET /api/auth/user", () => {
  beforeEach(() => {
    mockCreateServer.mockReset();
  });

  it("returns 401 without user", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });
    const res = await getAuthUser();
    expect(res.status).toBe(401);
  });

  it("returns userId", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "uid" } }, error: null }),
      },
    });
    const res = await getAuthUser();
    expect(res.status).toBe(200);
    expect((await res.json()).userId).toBe("uid");
  });

  it("returns 500 when Supabase client fails", async () => {
    mockCreateServer.mockRejectedValue(new Error("connection failed"));
    const res = await getAuthUser();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Internal server error");
  });
});

describe("POST /api/timeline", () => {
  beforeEach(() => {
    mockCreateTimelineEntry.mockReset();
  });

  it("returns 400 on invalid json", async () => {
    const req = new Request("http://localhost/api/timeline", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    }) as unknown as NextRequest;
    const res = await postTimeline(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when title missing", async () => {
    const res = await postTimeline(jsonRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 201 on success", async () => {
    mockCreateTimelineEntry.mockResolvedValue({ id: "t1" });
    const res = await postTimeline(jsonRequest({ title: "Note" }));
    expect(res.status).toBe(201);
  });

  it("returns 400 when content or contact_id types are invalid", async () => {
    const res = await postTimeline(
      jsonRequest({
        title: "T",
        content: 123,
        company_id: "550e8400-e29b-41d4-a716-446655440000",
        contact_id: 99,
      }),
    );
    expect(res.status).toBe(400);
    expect(mockCreateTimelineEntry).not.toHaveBeenCalled();
  });

  it("maps string content, activity_type, and string contact_id", async () => {
    mockCreateTimelineEntry.mockResolvedValue({ id: "t3" });
    const company = "550e8400-e29b-41d4-a716-446655440000";
    const contact = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
    const res = await postTimeline(
      jsonRequest({
        title: "T",
        content: "hello note",
        activity_type: "email",
        company_id: company,
        contact_id: contact,
      }),
    );
    expect(res.status).toBe(201);
    expect(mockCreateTimelineEntry).toHaveBeenCalledWith({
      title: "T",
      content: "hello note",
      activity_type: "email",
      company_id: company,
      contact_id: contact,
    });
  });

  it("returns 500 when thrown value is not an Error", async () => {
    mockCreateTimelineEntry.mockRejectedValue("database string failure");
    const res = await postTimeline(jsonRequest({ title: "x" }));
    expect(res.status).toBe(500);
  });

  it("returns 401 when unauthorized", async () => {
    mockCreateTimelineEntry.mockRejectedValue(new Error("Unauthorized"));
    const res = await postTimeline(jsonRequest({ title: "x" }));
    expect(res.status).toBe(401);
  });

  it("returns 500 on unexpected error", async () => {
    mockCreateTimelineEntry.mockRejectedValue(new Error("database offline"));
    const res = await postTimeline(jsonRequest({ title: "x" }));
    expect(res.status).toBe(500);
  });
});

describe("/api/timeline/[id]", () => {
  beforeEach(() => {
    mockCreateServer.mockReset();
    mockUpdateTimelineEntry.mockReset();
    mockDeleteTimeline.mockReset();
  });

  const authedServer = () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }),
    },
  });

  it("PUT updates entry", async () => {
    mockCreateServer.mockResolvedValue(authedServer());
    mockUpdateTimelineEntry.mockResolvedValue({ id: "t1", title: "x" });
    const res = await putTimelineId(jsonRequest({ title: "x" }), {
      params: Promise.resolve({ id: "t1" }),
    });
    expect(res.status).toBe(200);
  });

  it("PUT returns 401 without user", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });
    const res = await putTimelineId(jsonRequest({ title: "x" }), {
      params: Promise.resolve({ id: "t1" }),
    });
    expect(res.status).toBe(401);
  });

  it("PUT returns 401 when getUser returns an auth error", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "u1" } },
          error: { message: "JWT expired" },
        }),
      },
    });
    const res = await putTimelineId(jsonRequest({ title: "x" }), {
      params: Promise.resolve({ id: "t1" }),
    });
    expect(res.status).toBe(401);
  });

  it("DELETE removes entry", async () => {
    mockCreateServer.mockResolvedValue(authedServer());
    mockDeleteTimeline.mockResolvedValue(undefined);
    const res = await deleteTimelineId({} as NextRequest, {
      params: Promise.resolve({ id: "t1" }),
    });
    expect(res.status).toBe(200);
  });

  it("PUT returns 500 when update fails", async () => {
    mockCreateServer.mockResolvedValue(authedServer());
    mockUpdateTimelineEntry.mockRejectedValue(new Error("update failed"));
    const res = await putTimelineId(jsonRequest({ title: "x" }), {
      params: Promise.resolve({ id: "t1" }),
    });
    expect(res.status).toBe(500);
  });

  it("DELETE returns 500 when delete fails", async () => {
    mockCreateServer.mockResolvedValue(authedServer());
    mockDeleteTimeline.mockRejectedValue(new Error("delete failed"));
    const res = await deleteTimelineId({} as NextRequest, {
      params: Promise.resolve({ id: "t1" }),
    });
    expect(res.status).toBe(500);
  });

  it("DELETE returns 401 when getUser returns an auth error", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "u1" } },
          error: { message: "Session invalid" },
        }),
      },
    });
    const res = await deleteTimelineId({} as NextRequest, {
      params: Promise.resolve({ id: "t1" }),
    });
    expect(res.status).toBe(401);
  });
});

describe("/api/reminders", () => {
  beforeEach(() => {
    mockCreateServer.mockReset();
    mockGetReminders.mockReset();
    mockCreateReminder.mockReset();
  });

  it("GET returns json", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }),
      },
    });
    mockGetReminders.mockResolvedValue([{ id: "r1" }]);
    const res = await getRemindersRoute();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: "r1" }]);
  });

  it("GET returns 401 without user", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });
    const res = await getRemindersRoute();
    expect(res.status).toBe(401);
  });

  it("POST creates reminder", async () => {
    mockCreateServer.mockResolvedValue({});
    mockCreateReminder.mockResolvedValue({ id: "new" });
    const res = await postRemindersRoute(jsonRequest({ title: "R" }));
    expect(res.status).toBe(201);
  });

  it("GET returns 500 when getReminders throws", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }),
      },
    });
    mockGetReminders.mockRejectedValue(new Error("db error"));
    const res = await getRemindersRoute();
    expect(res.status).toBe(500);
  });

  it("POST returns 500 when createReminderAction throws", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }),
      },
    });
    mockCreateReminder.mockRejectedValue(new Error("insert failed"));
    const res = await postRemindersRoute(jsonRequest({ title: "R" }));
    expect(res.status).toBe(500);
  });

  it("POST returns 401 when createReminderAction is unauthorized", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }),
      },
    });
    mockCreateReminder.mockRejectedValue(new Error("Unauthorized"));
    const res = await postRemindersRoute(jsonRequest({ title: "R" }));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/companies", () => {
  beforeEach(() => {
    mockCreateServer.mockReset();
    mockServiceCreateTimelineEntry.mockReset();
    vi.stubEnv("NODE_ENV", "development");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("inserts company in development", async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: "c1", firmenname: "X" },
      error: null,
    });
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single,
          })),
        })),
      })),
    });
    const res = await postCompanies(jsonRequest({ firmenname: "X", kundentyp: "marina", status: "lead" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.id).toBe("c1");
  });

  it("returns 401 in production without user", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error("no") }),
      },
    });
    const res = await postCompanies(jsonRequest({ firmenname: "X", kundentyp: "marina", status: "lead" }));
    expect(res.status).toBe(401);
  });

  it("inserts in production when user is authenticated without auth error", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const single = vi.fn().mockResolvedValue({
      data: { id: "prod-1", firmenname: "Y" },
      error: null,
    });
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single,
          })),
        })),
      })),
    });
    const res = await postCompanies(jsonRequest({ firmenname: "Y", kundentyp: "hotel", status: "lead" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.id).toBe("prod-1");
    expect(mockServiceCreateTimelineEntry).not.toHaveBeenCalled();
  });

  it("creates OSM import timeline when import header and authenticated user are present", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mockServiceCreateTimelineEntry.mockResolvedValue({ id: "tl-1", title: "OpenStreetMap import" });
    const single = vi.fn().mockResolvedValue({
      data: { id: "c-osm", firmenname: "Marina", osm: "node/123" },
      error: null,
    });
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single,
          })),
        })),
      })),
    });
    const req = new Request("http://localhost/api/companies", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [COMPANY_IMPORT_SOURCE_HEADER]: COMPANY_IMPORT_SOURCE_OSM_POI,
        "accept-language": "en-US,en;q=0.9",
      },
      body: JSON.stringify({
        firmenname: "Marina",
        kundentyp: "marina",
        status: "lead",
        osm: "node/123",
      }),
    }) as unknown as NextRequest;
    const res = await postCompanies(req);
    expect(res.status).toBe(200);
    expect(mockServiceCreateTimelineEntry).toHaveBeenCalledTimes(1);
    expect(mockServiceCreateTimelineEntry.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        company_id: "c-osm",
        activity_type: "import",
        user_id: "user-1",
        content: expect.stringContaining("https://www.openstreetmap.org/node/123"),
      }),
    );
  });

  it("returns 200 when OSM timeline insert fails after company insert", async () => {
    vi.stubEnv("NODE_ENV", "production");
    mockServiceCreateTimelineEntry.mockRejectedValue(new Error("timeline rls"));
    const single = vi.fn().mockResolvedValue({
      data: { id: "c-osm2", firmenname: "Dock", osm: "way/9" },
      error: null,
    });
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1" } },
          error: null,
        }),
      },
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single,
          })),
        })),
      })),
    });
    const req = new Request("http://localhost/api/companies", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [COMPANY_IMPORT_SOURCE_HEADER]: COMPANY_IMPORT_SOURCE_OSM_POI,
      },
      body: JSON.stringify({
        firmenname: "Dock",
        kundentyp: "marina",
        status: "lead",
        osm: "way/9",
      }),
    }) as unknown as NextRequest;
    const res = await postCompanies(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("c-osm2");
  });

  it("returns 400 when Supabase insert returns error", async () => {
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "duplicate key" },
    });
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single,
          })),
        })),
      })),
    });
    const res = await postCompanies(jsonRequest({ firmenname: "X", kundentyp: "marina", status: "lead" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 500 when insert succeeds without id", async () => {
    const single = vi.fn().mockResolvedValue({
      data: { firmenname: "Only" },
      error: null,
    });
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single,
          })),
        })),
      })),
    });
    const res = await postCompanies(jsonRequest({ firmenname: "X", kundentyp: "marina", status: "lead" }));
    expect(res.status).toBe(500);
  });

  it("returns 400 when request body is invalid JSON", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });
    const bad = new Request("http://localhost/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json{",
    });
    const res = await postCompanies(bad);
    expect(res.status).toBe(400);
  });

  it("returns 500 with generic German message when client factory rejects non-Error", async () => {
    mockCreateServer.mockRejectedValue("offline");
    const res = await postCompanies(jsonRequest({ firmenname: "X", kundentyp: "marina", status: "lead" }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Interner Serverfehler");
  });
});

describe("/api/contacts/[id]", () => {
  beforeEach(() => {
    mockCreateServer.mockReset();
    mockDeleteContact.mockReset();
  });

  it("GET returns contact", async () => {
    mockCreateServer.mockResolvedValue(
      mockServerClientWithUser({
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: "c1", vorname: "A" },
            error: null,
          }),
        })),
      }),
    );
    const res = await getContact({} as Request, { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("PUT updates contact", async () => {
    mockCreateServer.mockResolvedValue(
      mockServerClientWithUser({
        from: vi.fn(() => ({
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: "c1" }, error: null }),
        })),
      }),
    );
    const res = await putContact(jsonRequest({ vorname: "B" }), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(200);
  });

  it("DELETE returns success", async () => {
    mockDeleteContact.mockResolvedValue(undefined);
    const res = await deleteContact({} as Request, { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(200);
  });

  it("GET returns 500 on query error", async () => {
    mockCreateServer.mockResolvedValue(
      mockServerClientWithUser({
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "not found" },
          }),
        })),
      }),
    );
    const res = await getContact({} as Request, { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(500);
  });

  it("PUT returns 500 on update error", async () => {
    mockCreateServer.mockResolvedValue(
      mockServerClientWithUser({
        from: vi.fn(() => ({
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: { message: "conflict" } }),
        })),
      }),
    );
    const res = await putContact(jsonRequest({ vorname: "B" }), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(500);
  });

  it("GET returns 401 without user", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });
    const res = await getContact({} as Request, { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(401);
  });

  it("PUT returns 401 without user", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });
    const res = await putContact(jsonRequest({ vorname: "B" }), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(401);
  });

  it("DELETE returns 500 when trash action throws", async () => {
    mockDeleteContact.mockRejectedValue(new Error("cannot delete"));
    const res = await deleteContact({} as Request, { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(500);
  });

  it("DELETE returns 500 with generic message when thrown value is not an Error", async () => {
    mockDeleteContact.mockRejectedValue("constraint failed");
    const res = await deleteContact({} as Request, { params: Promise.resolve({ id: "c1" }) });
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Delete failed");
  });
});

describe("POST /api/send-test-email", () => {
  beforeEach(() => {
    mockCreateServer.mockReset();
    mockGetUserSettings.mockReset();
    mockSendMail.mockReset();
    mockSendMail.mockResolvedValue({});
  });

  it("returns 401 without user", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });
    const res = await postSendTestEmail(jsonRequest({ recipient: "a@b.co" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid recipient", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u" } }, error: null }),
      },
    });
    const res = await postSendTestEmail(jsonRequest({ recipient: "bad" }));
    expect(res.status).toBe(400);
  });

  it("sends when smtp configured", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u" } }, error: null }),
      },
    });
    mockGetUserSettings.mockResolvedValue([
      { key: "smtp_host", value: "smtp.example.com" },
      { key: "smtp_port", value: "587" },
      { key: "smtp_username", value: "user@example.com" },
      { key: "smtp_password", value: "secret" },
      { key: "smtp_sender_name", value: "CRM" },
    ]);
    const res = await postSendTestEmail(jsonRequest({ recipient: "to@example.com" }));
    expect(res.status).toBe(200);
    expect(mockSendMail).toHaveBeenCalled();
  });

  it("returns 400 when SMTP settings incomplete", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u" } }, error: null }),
      },
    });
    mockGetUserSettings.mockResolvedValue([{ key: "smtp_host", value: "only-host.example.com" }]);
    const res = await postSendTestEmail(jsonRequest({ recipient: "to@example.com" }));
    expect(res.status).toBe(400);
  });

  it("returns 500 when sendMail throws", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u" } }, error: null }),
      },
    });
    mockGetUserSettings.mockResolvedValue([
      { key: "smtp_host", value: "smtp.example.com" },
      { key: "smtp_port", value: "587" },
      { key: "smtp_username", value: "user@example.com" },
      { key: "smtp_password", value: "secret" },
      { key: "smtp_sender_name", value: "CRM" },
    ]);
    mockSendMail.mockRejectedValue(new Error("SMTP send failed"));
    const res = await postSendTestEmail(jsonRequest({ recipient: "to@example.com" }));
    expect(res.status).toBe(500);
  });
});

describe("POST /api/test-smtp", () => {
  beforeEach(() => {
    mockCreateServer.mockReset();
    mockSendMail.mockReset();
    mockSendMail.mockResolvedValue({});
  });

  it("returns 401 without user", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });
    const res = await postTestSmtp(
      jsonRequest({
        host: "h",
        port: "587",
        username: "u",
        password: "p",
        recipient: "r@r.co",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when fields missing", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u" } }, error: null }),
      },
    });
    const res = await postTestSmtp(jsonRequest({ host: "h" }));
    expect(res.status).toBe(400);
  });

  it("sends test mail", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u" } }, error: null }),
      },
    });
    const res = await postTestSmtp(
      jsonRequest({
        host: "smtp.example.com",
        port: "587",
        username: "u@example.com",
        password: "p",
        recipient: "r@r.co",
      }),
    );
    expect(res.status).toBe(200);
    expect(mockSendMail).toHaveBeenCalled();
  });

  it("includes TLS Ja and default display name in html when secure without fromName", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u" } }, error: null }),
      },
    });
    const res = await postTestSmtp(
      jsonRequest({
        host: "smtp.example.com",
        port: "587",
        username: "u@example.com",
        password: "p",
        recipient: "r@r.co",
        secure: true,
      }),
    );
    expect(res.status).toBe(200);
    const firstCall = mockSendMail.mock.calls[0];
    if (firstCall === undefined || firstCall[0] === undefined) {
      throw new Error("expected sendMail to have been called");
    }
    const opts = firstCall[0] as { html?: string; from?: string };
    expect(opts.html).toContain("Ja");
    expect(opts.html).toContain("AquaDock CRM");
    expect(opts.from).toContain("AquaDock CRM");
  });

  it("returns 500 when sendMail throws", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u" } }, error: null }),
      },
    });
    mockSendMail.mockRejectedValue(new Error("network error"));
    const res = await postTestSmtp(
      jsonRequest({
        host: "smtp.example.com",
        port: "587",
        username: "u@example.com",
        password: "p",
        recipient: "r@r.co",
      }),
    );
    expect(res.status).toBe(500);
  });

  it("returns 500 with generic German message when sendMail rejects non-Error", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u" } }, error: null }),
      },
    });
    mockSendMail.mockRejectedValue("ECONNRESET");
    const res = await postTestSmtp(
      jsonRequest({
        host: "smtp.example.com",
        port: "587",
        username: "u@example.com",
        password: "p",
        recipient: "r@r.co",
      }),
    );
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Unbekannter Fehler");
  });
});
