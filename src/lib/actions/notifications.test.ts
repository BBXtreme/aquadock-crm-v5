import { beforeEach, describe, expect, it, vi } from "vitest";

import { NOTIFICATION_UI } from "@/lib/constants/notifications";

const requireUser = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/require-user", () => ({
  requireUser,
}));

const requireAdmin = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin,
}));

const createServerSupabaseClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient,
}));

const USER_ID = "10000000-0000-4000-8000-000000000001";

describe("notification server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUser.mockResolvedValue({ id: USER_ID, role: "user" });
    requireAdmin.mockResolvedValue({ id: USER_ID, role: "admin" });
    createServerSupabaseClient.mockResolvedValue({
      from: vi.fn(() => ({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      })),
    } as never);
  });

  describe("saveNotificationPreferencesAction", () => {
    it("throws validation error for invalid input before touching preferences", async () => {
      createServerSupabaseClient.mockResolvedValue({} as never);

      const { saveNotificationPreferencesAction } = await import("@/lib/actions/notifications");
      await expect(saveNotificationPreferencesAction({})).rejects.toThrow(
        NOTIFICATION_UI.toastValidationError,
      );
    });

    it("persists valid preferences", async () => {
      const upsert = vi.fn().mockResolvedValue({ error: null });
      createServerSupabaseClient.mockResolvedValue({
        from: vi.fn(() => ({ upsert })),
      } as never);

      const { saveNotificationPreferencesAction } = await import("@/lib/actions/notifications");
      await saveNotificationPreferencesAction({ pushEnabled: false, emailEnabled: true });

      expect(requireUser).toHaveBeenCalled();
      expect(upsert).toHaveBeenCalled();
    });
  });

  describe("saveAdminGlobalInAppFeedAction", () => {
    it("throws when user is not admin despite requireAdmin resolving", async () => {
      requireAdmin.mockResolvedValue({ id: USER_ID, role: "user" });

      const { saveAdminGlobalInAppFeedAction } = await import("@/lib/actions/notifications");
      await expect(saveAdminGlobalInAppFeedAction(true)).rejects.toThrow(
        "Nur für Administratoren",
      );
    });

    it("rejects non-boolean input", async () => {
      const { saveAdminGlobalInAppFeedAction } = await import("@/lib/actions/notifications");
      await expect(saveAdminGlobalInAppFeedAction("true")).rejects.toThrow();
    });

    it("upserts when admin and input is boolean", async () => {
      const upsert = vi.fn().mockResolvedValue({ error: null });
      createServerSupabaseClient.mockResolvedValue({
        from: vi.fn(() => ({ upsert })),
      } as never);

      const { saveAdminGlobalInAppFeedAction } = await import("@/lib/actions/notifications");
      await saveAdminGlobalInAppFeedAction(false);

      expect(requireAdmin).toHaveBeenCalled();
      expect(upsert).toHaveBeenCalledWith(
        {
          user_id: USER_ID,
          key: "notification_admin_global_in_app_feed",
          value: false,
        },
        { onConflict: "user_id,key" },
      );
    });
  });
});
