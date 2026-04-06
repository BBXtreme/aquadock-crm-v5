/** Radix Select reserves "" for clearing; use a sentinel for "no filter". */
export const BREVO_RECIPIENT_FILTER_ALL = "__all__" as const;

/** Stable React keys for loading skeleton rows (avoid index-only keys). */
export const BREVO_RECIPIENT_SKELETON_ROW_KEYS = [
  "brevo-recipient-row-1",
  "brevo-recipient-row-2",
  "brevo-recipient-row-3",
  "brevo-recipient-row-4",
  "brevo-recipient-row-5",
  "brevo-recipient-row-6",
] as const;

/** Must stay aligned with `brevoRecipientColumns` order and count. */
export const BREVO_RECIPIENT_SKELETON_COL_KEYS = [
  "select",
  "vorname",
  "nachname",
  "email",
  "companies.kundentyp",
  "companies.status",
] as const;
