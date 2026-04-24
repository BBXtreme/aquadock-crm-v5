import type { Page } from "@playwright/test";

import { PW_RECOVERY_SESSION_STORAGE_KEY } from "../../../src/lib/constants/auth-recovery";
import { LS_APPEARANCE_LOCALE } from "../../../src/lib/constants/theme";

/**
 * Run before `page.goto` to `/login` (or any first navigation).
 *
 * - Pins next-intl to English (same key as `I18nProvider`).
 * - Clears {@link PW_RECOVERY_SESSION_STORAGE_KEY}: if left set, `/login` latches to
 *   password-recovery UI and **never mounts** `.login-supabase-auth`.
 */
export async function pinEnglishAppearance(page: Page): Promise<void> {
  await page.addInitScript(
    ([localeKey, recoveryKey]) => {
      localStorage.setItem(localeKey, "en");
      try {
        sessionStorage.removeItem(recoveryKey);
      } catch {
        /* ignore */
      }
    },
    [LS_APPEARANCE_LOCALE, PW_RECOVERY_SESSION_STORAGE_KEY] as [string, string],
  );
}
