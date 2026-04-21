import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateServer = vi.hoisted(() => vi.fn());
const mockCreateTimelineEntry = vi.hoisted(() => vi.fn());

vi.mock("@/lib/services/in-app-notifications", () => ({
  createInAppNotification: vi.fn().mockResolvedValue(null),
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
});
