// Keys and defaults for notification preferences in user_settings (EAV).

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
