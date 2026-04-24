import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateServer = vi.hoisted(() => vi.fn());
const mockCreateTimelineEntry = vi.hoisted(() => vi.fn());
const mockNotify = vi.hoisted(() => vi.fn().mockResolvedValue(null));

vi.mock("@/lib/services/in-app-notifications", () => ({
  createInAppNotification: (...args: unknown[]) => mockNotify(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: () => mockCreateServer(),
}));

vi.mock("@/lib/services/timeline", () => ({
  createTimelineEntry: (...args: unknown[]) => mockCreateTimelineEntry(...args),
}));

function supabaseWithAuth(userId: string) {
  const companiesChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }),
    },
    from: vi.fn((table: string) => {
      if (table === "companies") {
        return companiesChain;
      }
      return {};
    }),
  };
}

import { createAuthenticatedTimelineEntry } from "./timeline-insert";

describe("createAuthenticatedTimelineEntry", () => {
  beforeEach(() => {
    mockCreateServer.mockReset();
    mockCreateTimelineEntry.mockReset();
    mockNotify.mockReset();
    mockNotify.mockResolvedValue(null);
  });

  it("throws when unauthenticated (auth error)", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error("x") }),
      },
    });

    await expect(
      createAuthenticatedTimelineEntry({ title: "x" }),
    ).rejects.toThrow("Unauthorized");
  });

  it("throws when user is null without auth error", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });

    await expect(createAuthenticatedTimelineEntry({ title: "x" })).rejects.toThrow("Unauthorized");
  });

  it("creates entry for authenticated user", async () => {
    mockCreateServer.mockResolvedValue(supabaseWithAuth("u1"));
    mockCreateTimelineEntry.mockResolvedValue({ id: "e1", company_id: "c1" });

    const result = await createAuthenticatedTimelineEntry({
      title: "Hello",
      content: "Body",
      activity_type: "call",
      company_id: "c1",
      contact_id: null,
    });

    expect(result).toEqual({ id: "e1", company_id: "c1" });
    expect(mockCreateTimelineEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Hello",
        content: "Body",
        activity_type: "call",
        company_id: "c1",
        contact_id: null,
        user_id: "u1",
        created_by: "u1",
        updated_by: "u1",
      }),
      expect.anything(),
    );
  });

  it("sets activity_type import when title implies CSV import but type is other", async () => {
    mockCreateServer.mockResolvedValue(supabaseWithAuth("u3"));
    mockCreateTimelineEntry.mockResolvedValue({ id: "e3", company_id: null });

    await createAuthenticatedTimelineEntry({
      title: "CSV import batch 1",
      activity_type: "other",
    });

    expect(mockCreateTimelineEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        activity_type: "import",
      }),
      expect.anything(),
    );
  });

  it("defaults activity_type to other when empty string and maps optional fields", async () => {
    mockCreateServer.mockResolvedValue(supabaseWithAuth("u2"));
    mockCreateTimelineEntry.mockResolvedValue({ id: "e2", company_id: null });

    await createAuthenticatedTimelineEntry({
      title: "Only title",
      activity_type: "",
    });

    expect(mockCreateTimelineEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        content: null,
        activity_type: "other",
        company_id: null,
        contact_id: null,
      }),
      expect.anything(),
    );
  });

  it("notifies company owner when entry is tied to a company they do not own", async () => {
    const companiesChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { user_id: "owner-99", firmenname: "Harbor GmbH" },
        error: null,
      }),
    };
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "actor-1" } }, error: null }),
      },
      from: vi.fn((table: string) => (table === "companies" ? companiesChain : {})),
    });
    mockCreateTimelineEntry.mockResolvedValue({ id: "tl-1", company_id: "co-1" });

    await createAuthenticatedTimelineEntry({ title: "Note", company_id: "co-1" });

    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "timeline_on_company",
        userId: "owner-99",
        dedupeKey: "timeline_on_company:tl-1",
        payload: { companyId: "co-1", timelineId: "tl-1" },
      }),
    );
  });

  it("does not notify when the actor is the company owner", async () => {
    const companiesChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { user_id: "actor-1", firmenname: "Mine" },
        error: null,
      }),
    };
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "actor-1" } }, error: null }),
      },
      from: vi.fn((table: string) => (table === "companies" ? companiesChain : {})),
    });
    mockCreateTimelineEntry.mockResolvedValue({ id: "tl-2", company_id: "co-2" });

    await createAuthenticatedTimelineEntry({ title: "Self note", company_id: "co-2" });

    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("does not notify when company lookup returns an error", async () => {
    const companiesChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: "nope" } }),
    };
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "actor-1" } }, error: null }),
      },
      from: vi.fn((table: string) => (table === "companies" ? companiesChain : {})),
    });
    mockCreateTimelineEntry.mockResolvedValue({ id: "tl-3", company_id: "co-3" });

    await createAuthenticatedTimelineEntry({ title: "Note", company_id: "co-3" });

    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("does not notify when company row is missing", async () => {
    const companiesChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "actor-1" } }, error: null }),
      },
      from: vi.fn((table: string) => (table === "companies" ? companiesChain : {})),
    });
    mockCreateTimelineEntry.mockResolvedValue({ id: "tl-4", company_id: "co-4" });

    await createAuthenticatedTimelineEntry({ title: "Note", company_id: "co-4" });

    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("does not notify when company has no responsible user", async () => {
    const companiesChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { user_id: null, firmenname: "Orphan" },
        error: null,
      }),
    };
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "actor-1" } }, error: null }),
      },
      from: vi.fn((table: string) => (table === "companies" ? companiesChain : {})),
    });
    mockCreateTimelineEntry.mockResolvedValue({ id: "tl-5", company_id: "co-5" });

    await createAuthenticatedTimelineEntry({ title: "Note", company_id: "co-5" });

    expect(mockNotify).not.toHaveBeenCalled();
  });
});
