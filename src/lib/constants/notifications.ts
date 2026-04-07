// Keys and defaults for notification preferences in user_settings (EAV).

import type { NotificationPreferences } from "@/lib/validations/settings";

export const NOTIFICATION_SETTING_KEYS = {
  push: "notification_push_enabled",
  email: "notification_email_enabled",
} as const;

/** All keys fetched/upserted together for the notifications card */
export const NOTIFICATION_SETTING_KEYS_LIST = [
  NOTIFICATION_SETTING_KEYS.push,
  NOTIFICATION_SETTING_KEYS.email,
] as const;

export const NOTIFICATION_DEFAULTS = {
  pushEnabled: true,
  emailEnabled: true,
} as const;

/** German UI copy for the Settings notifications card and related toasts */
export const NOTIFICATION_UI = {
  cardTitle: "Benachrichtigungen",
  cardDescription:
    "Legen Sie fest, wie Sie über neue Leads, fällige Aufgaben und wichtige Änderungen informiert werden möchten.",
  pushLabel: "Push-Benachrichtigungen",
  pushHelp:
    "Sofortige Hinweise zu neuen Leads, Remindern und Statusänderungen direkt im Browser.",
  emailLabel: "E-Mail-Benachrichtigungen",
  emailHelp: "Wichtige Updates, Zusammenfassungen und Statusänderungen per E-Mail.",
  saving: "Wird gespeichert…",
  toastPushActivated: "Push-Benachrichtigungen wurden aktiviert",
  toastPushDeactivated: "Push-Benachrichtigungen wurden deaktiviert",
  toastEmailActivated: "E-Mail-Benachrichtigungen wurden aktiviert",
  toastEmailDeactivated: "E-Mail-Benachrichtigungen wurden deaktiviert",
  toastSaveErrorTitle: "Benachrichtigungen konnten nicht gespeichert werden",
  toastValidationError: "Ungültige Benachrichtigungseinstellungen",
  unknownError: "Unbekannter Fehler",
} as const;

export type NotificationPreferenceChannel = "push" | "email";

/** Success toast for the channel that was toggled (all strings from NOTIFICATION_UI). */
export function getNotificationPreferenceSuccessToast(
  changed: NotificationPreferenceChannel,
  prefs: NotificationPreferences,
): string {
  if (changed === "push") {
    return prefs.pushEnabled ? NOTIFICATION_UI.toastPushActivated : NOTIFICATION_UI.toastPushDeactivated;
  }
  return prefs.emailEnabled ? NOTIFICATION_UI.toastEmailActivated : NOTIFICATION_UI.toastEmailDeactivated;
}
