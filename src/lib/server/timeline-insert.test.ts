import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateServer = vi.hoisted(() => vi.fn());
const mockCreateTimelineEntry = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: () => mockCreateServer(),
}));

vi.mock("@/lib/services/timeline", () => ({
  createTimelineEntry: (...args: unknown[]) => mockCreateTimelineEntry(...args),
}));

import { createAuthenticatedTimelineEntry } from "./timeline-insert";

describe("createAuthenticatedTimelineEntry", () => {
  beforeEach(() => {
    mockCreateServer.mockReset();
    mockCreateTimelineEntry.mockReset();
  });

  it("throws when unauthenticated", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error("x") }),
      },
    });

    await expect(
      createAuthenticatedTimelineEntry({ title: "x" }),
    ).rejects.toThrow("Unauthorized");
  });

  it("creates entry for authenticated user", async () => {
    mockCreateServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }),
      },
    });
    mockCreateTimelineEntry.mockResolvedValue({ id: "e1" });

    const result = await createAuthenticatedTimelineEntry({
      title: "Hello",
      content: "Body",
      activity_type: "call",
      company_id: "c1",
      contact_id: null,
    });

    expect(result).toEqual({ id: "e1" });
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
});
