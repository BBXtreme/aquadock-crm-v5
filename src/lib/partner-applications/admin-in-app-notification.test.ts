import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateInAppNotification = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());

vi.mock("@/lib/services/in-app-notifications", () => ({
  createInAppNotification: mockCreateInAppNotification,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

import {
  buildPartnerApplicationNotificationCopy,
  notifyAdminsOfNewPartnerApplication,
} from "./admin-in-app-notification";

const APPLICATION_ID = "00000000-0000-4000-8000-000000000001";
const ADMIN_A = "10000000-0000-4000-8000-000000000001";
const ADMIN_B = "10000000-0000-4000-8000-000000000002";

describe("notifyAdminsOfNewPartnerApplication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateInAppNotification.mockResolvedValue({ id: "n1" });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ user_id: ADMIN_A }, { user_id: ADMIN_B }],
          error: null,
        }),
      }),
    });
  });

  it("builds German notification copy", () => {
    expect(
      buildPartnerApplicationNotificationCopy({
        firstName: "Max",
        lastName: "Mustermann",
        cityRegion: "Frankfurt",
        countryCode: "DE",
      }),
    ).toEqual({
      title: "Neue Vertriebspartner-Bewerbung",
      body: "Max Mustermann (Frankfurt, DE) hat sich als Vertriebspartner beworben.",
    });
  });

  it("notifies every admin without admin-feed mirroring", async () => {
    await notifyAdminsOfNewPartnerApplication({
      applicationId: APPLICATION_ID,
      input: {
        firstName: "Max",
        lastName: "Mustermann",
        cityRegion: "Frankfurt",
        countryCode: "DE",
      },
    });

    expect(mockCreateInAppNotification).toHaveBeenCalledTimes(2);
    expect(mockCreateInAppNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "partner_application_received",
        userId: ADMIN_A,
        payload: { applicationId: APPLICATION_ID },
        dedupeKey: `partner_application_received:${APPLICATION_ID}:${ADMIN_A}`,
      }),
      { mirrorToAdmins: false },
    );
  });
});
