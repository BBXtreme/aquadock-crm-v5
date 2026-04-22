import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createInAppNotification = vi.hoisted(() => vi.fn());
const createTimelineEntry = vi.hoisted(() => vi.fn());

vi.mock("@/lib/services/in-app-notifications", () => ({
  createInAppNotification,
}));

vi.mock("@/lib/services/timeline", () => ({
  createTimelineEntry,
}));

const getCurrentUser = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/get-current-user", () => ({
  getCurrentUser,
}));

const createServerSupabaseClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/services/semantic-search", () => ({
  generateAndStoreCompanyEmbedding: vi.fn(),
}));

const COMPANY_ID = "20000000-0000-4000-8000-000000000001";
const OLD_OWNER = "10000000-0000-4000-8000-000000000001";
const NEW_OWNER = "10000000-0000-4000-8000-000000000002";
const ACTOR = "10000000-0000-4000-8000-000000000003";

function supabaseForUpdateCompany(priorUserId: string | null, newUserId: string | null) {
  const priorMaybeSingle = vi.fn().mockResolvedValue({
    data: { user_id: priorUserId, firmenname: "Acme GmbH" },
    error: null,
  });
  const updateSingle = vi.fn().mockResolvedValue({
    data: {
      id: COMPANY_ID,
      firmenname: "Acme GmbH",
      user_id: newUserId,
      kundentyp: "restaurant",
      status: "lead",
    },
    error: null,
  });
  const profileRows: { id: string; display_name: string | null }[] = [];
  if (priorUserId != null && priorUserId !== "") {
    profileRows.push({ id: priorUserId, display_name: `User ${priorUserId.slice(0, 4)}` });
  }
  if (newUserId != null && newUserId !== "") {
    if (!profileRows.some((r) => r.id === newUserId)) {
      profileRows.push({ id: newUserId, display_name: `User ${newUserId.slice(0, 4)}` });
    }
  }
  return {
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({ data: profileRows, error: null }),
          })),
        };
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: priorMaybeSingle,
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: updateSingle,
            })),
          })),
        })),
      };
    }),
  };
}

describe("updateCompany (owner notification)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createInAppNotification.mockResolvedValue({ id: "n1" } as never);
    createTimelineEntry.mockResolvedValue({ id: "t1" } as never);
    getCurrentUser.mockResolvedValue({ id: ACTOR } as never);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("calls createInAppNotification exactly once when user_id changes", async () => {
    createServerSupabaseClient.mockResolvedValue(supabaseForUpdateCompany(OLD_OWNER, NEW_OWNER) as never);

    const { updateCompany } = await import("@/lib/actions/companies");
    await updateCompany(COMPANY_ID, { user_id: NEW_OWNER });

    expect(createInAppNotification).toHaveBeenCalledTimes(1);
    expect(createInAppNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "company_owner_assigned",
        userId: NEW_OWNER,
        payload: { companyId: COMPANY_ID },
        dedupeKey: `company_owner_assigned:${COMPANY_ID}:${NEW_OWNER}:${OLD_OWNER}`,
        actorUserId: ACTOR,
      }),
    );
    const call = createInAppNotification.mock.calls[0]?.[0];
    expect(call).toBeDefined();
    if (call != null && "title" in call) {
      expect(typeof call.title).toBe("string");
      expect(call.title.length).toBeGreaterThan(0);
      expect(call.body).toBeDefined();
    }

    expect(createTimelineEntry).toHaveBeenCalledTimes(1);
    expect(createTimelineEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: COMPANY_ID,
        activity_type: "other",
        contact_id: null,
        content: null,
        user_id: ACTOR,
        created_by: ACTOR,
        updated_by: ACTOR,
        title: expect.stringContaining("→"),
      }),
      expect.anything(),
    );
  });

  it("uses dedupe segment none when prior owner was null", async () => {
    createServerSupabaseClient.mockResolvedValue(supabaseForUpdateCompany(null, NEW_OWNER) as never);

    const { updateCompany } = await import("@/lib/actions/companies");
    await updateCompany(COMPANY_ID, { user_id: NEW_OWNER });

    expect(createInAppNotification).toHaveBeenCalledTimes(1);
    expect(createInAppNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        dedupeKey: `company_owner_assigned:${COMPANY_ID}:${NEW_OWNER}:none`,
      }),
    );
    expect(createTimelineEntry).toHaveBeenCalledTimes(1);
  });

  it("does not call createInAppNotification when user_id is unchanged", async () => {
    createServerSupabaseClient.mockResolvedValue(supabaseForUpdateCompany(OLD_OWNER, OLD_OWNER) as never);

    const { updateCompany } = await import("@/lib/actions/companies");
    await updateCompany(COMPANY_ID, { user_id: OLD_OWNER });

    expect(createInAppNotification).not.toHaveBeenCalled();
    expect(createTimelineEntry).not.toHaveBeenCalled();
  });

  it("does not call createInAppNotification when update omits user_id", async () => {
    createServerSupabaseClient.mockResolvedValue(supabaseForUpdateCompany(OLD_OWNER, OLD_OWNER) as never);

    const { updateCompany } = await import("@/lib/actions/companies");
    await updateCompany(COMPANY_ID, { firmenname: "Renamed GmbH" });

    expect(createInAppNotification).not.toHaveBeenCalled();
    expect(createTimelineEntry).not.toHaveBeenCalled();
  });

  it("writes timeline audit when user_id is cleared to null", async () => {
    createServerSupabaseClient.mockResolvedValue(supabaseForUpdateCompany(OLD_OWNER, null) as never);

    const { updateCompany } = await import("@/lib/actions/companies");
    await updateCompany(COMPANY_ID, { user_id: null });

    expect(createInAppNotification).not.toHaveBeenCalled();
    expect(createTimelineEntry).toHaveBeenCalledTimes(1);
    const payload = createTimelineEntry.mock.calls[0]?.[0] as { title?: string };
    expect(payload?.title).toContain("→");
  });
});
