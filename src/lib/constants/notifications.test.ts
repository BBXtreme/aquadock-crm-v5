import { describe, expect, it } from "vitest";
import { getNotificationPreferenceSuccessToast, NOTIFICATION_UI } from "./notifications";

describe("getNotificationPreferenceSuccessToast", () => {
  it("returns push activated when push is on", () => {
    expect(
      getNotificationPreferenceSuccessToast("push", { pushEnabled: true, emailEnabled: false }),
    ).toBe(NOTIFICATION_UI.toastPushActivated);
  });

  it("returns push deactivated when push is off", () => {
    expect(
      getNotificationPreferenceSuccessToast("push", { pushEnabled: false, emailEnabled: true }),
    ).toBe(NOTIFICATION_UI.toastPushDeactivated);
  });

  it("returns email activated when email is on", () => {
    expect(
      getNotificationPreferenceSuccessToast("email", { pushEnabled: false, emailEnabled: true }),
    ).toBe(NOTIFICATION_UI.toastEmailActivated);
  });

  it("returns email deactivated when email is off", () => {
    expect(
      getNotificationPreferenceSuccessToast("email", { pushEnabled: true, emailEnabled: false }),
    ).toBe(NOTIFICATION_UI.toastEmailDeactivated);
  });
});
