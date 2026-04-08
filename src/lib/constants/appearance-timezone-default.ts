import { isValidIanaTimeZone } from "@/lib/validations/appearance";

/** Browser default IANA zone; SSR-safe callers should use `DEFAULT_APPEARANCE.timeZone` when `window` is absent. */
export function getDefaultAppearanceTimeZone(): string {
  if (typeof Intl === "undefined" || typeof Intl.DateTimeFormat === "undefined") {
    return "UTC";
  }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && isValidIanaTimeZone(tz)) {
      return tz;
    }
  } catch {
    // fall through
  }
  return "UTC";
}
