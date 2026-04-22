import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createInAppNotification = vi.hoisted(() => vi.fn());

vi.mock("@/lib/services/in-app-notifications", () => ({
  createInAppNotification,
}));

const getCurrentUser = vi.hoisted(() => vi.fn());
const createServerSupabaseClient = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/get-current-user", () => ({
  getCurrentUser,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient,
}));

const ACTOR = "10000000-0000-4000-8000-000000000001";
const COMPANY_OWNER = "10000000-0000-4000-8000-000000000002";
const PRIOR_CONTACT_OWNER = "10000000-0000-4000-8000-000000000003";
const NEW_CONTACT_OWNER = "10000000-0000-4000-8000-000000000004";
const COMPANY_ID = "20000000-0000-4000-8000-000000000001";
const CONTACT_ID = "20000000-0000-4000-8000-000000000002";

const minimalContactForm = {
  vorname: "Max",
  nachname: "Mustermann",
  company_id: COMPANY_ID,
  is_primary: false,
};

function companySelectChain(companyUserId: string | null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: companyUserId }, error: null }),
  };
}

describe("contact-server-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createInAppNotification.mockResolvedValue({ id: "n1" } as never);
    getCurrentUser.mockResolvedValue({ id: ACTOR } as never);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("createContactAction (inheritance)", () => {
    it("sets user_id from company owner when company has user_id", async () => {
      const single = vi.fn().mockResolvedValue({
        data: {
          id: CONTACT_ID,
          vorname: "Max",
          nachname: "Mustermann",
          user_id: COMPANY_OWNER,
          company_id: COMPANY_ID,
        },
        error: null,
      });
      createServerSupabaseClient.mockResolvedValue({
        from: vi.fn((table: string) => {
          if (table === "companies") {
            return companySelectChain(COMPANY_OWNER);
          }
          if (table === "contacts") {
            return {
              insert: vi.fn(() => ({
                select: vi.fn(() => ({ single })),
              })),
            };
          }
          throw new Error(`unexpected table: ${table}`);
        }),
      } as never);

      const { createContactAction } = await import("@/lib/actions/contact-server-actions");
      const row = await createContactAction(minimalContactForm);

      expect(row.user_id).toBe(COMPANY_OWNER);
      expect(createInAppNotification).not.toHaveBeenCalled();
    });

    it("falls back to current user when company has no owner", async () => {
      const single = vi.fn().mockResolvedValue({
        data: {
          id: CONTACT_ID,
          vorname: "Max",
          nachname: "Mustermann",
          user_id: ACTOR,
          company_id: COMPANY_ID,
        },
        error: null,
      });
      createServerSupabaseClient.mockResolvedValue({
        from: vi.fn((table: string) => {
          if (table === "companies") {
            return companySelectChain(null);
          }
          if (table === "contacts") {
            return {
              insert: vi.fn(() => ({
                select: vi.fn(() => ({ single })),
              })),
            };
          }
          throw new Error(`unexpected table: ${table}`);
        }),
      } as never);

      const { createContactAction } = await import("@/lib/actions/contact-server-actions");
      const row = await createContactAction(minimalContactForm);

      expect(row.user_id).toBe(ACTOR);
      expect(createInAppNotification).not.toHaveBeenCalled();
    });
  });

  describe("updateContactAction (assignment notification)", () => {
    it("calls createInAppNotification once when user_id changes and assignee is not the actor", async () => {
      const priorRow = {
        user_id: PRIOR_CONTACT_OWNER,
        vorname: "Max",
        nachname: "Mustermann",
        company_id: COMPANY_ID,
      };
      const updatedRow = {
        id: CONTACT_ID,
        vorname: "Max",
        nachname: "Mustermann",
        user_id: NEW_CONTACT_OWNER,
        company_id: COMPANY_ID,
      };
      const selectMaybeSingle = vi.fn().mockResolvedValue({ data: priorRow, error: null });
      const updateSingle = vi.fn().mockResolvedValue({ data: updatedRow, error: null });

      createServerSupabaseClient.mockResolvedValue({
        from: vi.fn((table: string) => {
          if (table === "companies") {
            return companySelectChain(NEW_CONTACT_OWNER);
          }
          if (table === "contacts") {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  is: vi.fn(() => ({
                    maybeSingle: selectMaybeSingle,
                  })),
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
          }
          throw new Error(`unexpected table: ${table}`);
        }),
      } as never);

      getCurrentUser.mockResolvedValue({ id: ACTOR } as never);

      const { updateContactAction } = await import("@/lib/actions/contact-server-actions");
      await updateContactAction(CONTACT_ID, minimalContactForm);

      expect(createInAppNotification).toHaveBeenCalledTimes(1);
      expect(createInAppNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "contact_assigned",
          userId: NEW_CONTACT_OWNER,
          payload: { contactId: CONTACT_ID, companyId: COMPANY_ID },
          dedupeKey: `contact_assigned:${CONTACT_ID}:${NEW_CONTACT_OWNER}:${PRIOR_CONTACT_OWNER}`,
          actorUserId: ACTOR,
        }),
      );
    });

    it("does not notify when user_id is unchanged", async () => {
      const priorRow = {
        user_id: COMPANY_OWNER,
        vorname: "Max",
        nachname: "Mustermann",
        company_id: COMPANY_ID,
      };
      const updatedRow = {
        id: CONTACT_ID,
        vorname: "Max",
        nachname: "Mustermann",
        user_id: COMPANY_OWNER,
        company_id: COMPANY_ID,
      };
      const selectMaybeSingle = vi.fn().mockResolvedValue({ data: priorRow, error: null });
      const updateSingle = vi.fn().mockResolvedValue({ data: updatedRow, error: null });

      createServerSupabaseClient.mockResolvedValue({
        from: vi.fn((table: string) => {
          if (table === "companies") {
            return companySelectChain(COMPANY_OWNER);
          }
          if (table === "contacts") {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  is: vi.fn(() => ({
                    maybeSingle: selectMaybeSingle,
                  })),
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
          }
          throw new Error(`unexpected table: ${table}`);
        }),
      } as never);

      const { updateContactAction } = await import("@/lib/actions/contact-server-actions");
      await updateContactAction(CONTACT_ID, minimalContactForm);

      expect(createInAppNotification).not.toHaveBeenCalled();
    });

    it("does not call createInAppNotification when new owner is the actor (helper short-circuit)", async () => {
      const priorRow = {
        user_id: PRIOR_CONTACT_OWNER,
        vorname: "Max",
        nachname: "Mustermann",
        company_id: COMPANY_ID,
      };
      const updatedRow = {
        id: CONTACT_ID,
        vorname: "Max",
        nachname: "Mustermann",
        user_id: ACTOR,
        company_id: COMPANY_ID,
      };
      const selectMaybeSingle = vi.fn().mockResolvedValue({ data: priorRow, error: null });
      const updateSingle = vi.fn().mockResolvedValue({ data: updatedRow, error: null });

      createServerSupabaseClient.mockResolvedValue({
        from: vi.fn((table: string) => {
          if (table === "companies") {
            return companySelectChain(null);
          }
          if (table === "contacts") {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  is: vi.fn(() => ({
                    maybeSingle: selectMaybeSingle,
                  })),
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
          }
          throw new Error(`unexpected table: ${table}`);
        }),
      } as never);

      getCurrentUser.mockResolvedValue({ id: ACTOR } as never);

      const { updateContactAction } = await import("@/lib/actions/contact-server-actions");
      await updateContactAction(CONTACT_ID, { ...minimalContactForm, company_id: null });

      expect(createInAppNotification).not.toHaveBeenCalled();
    });
  });
});
