import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";

import { CHANGELOG_LAST_SEEN_STORAGE_KEY } from "../../../src/content/changelog";
import { PW_RECOVERY_SESSION_STORAGE_KEY } from "../../../src/lib/constants/auth-recovery";
import { LS_APPEARANCE_LOCALE } from "../../../src/lib/constants/theme";

function readPackageJsonVersion(): string {
  const raw = readFileSync(join(process.cwd(), "package.json"), "utf8");
  const parsed = JSON.parse(raw) as { version?: string };
  if (typeof parsed.version !== "string" || parsed.version.length === 0) {
    throw new Error("package.json missing string version");
  }
  return parsed.version;
}

/**
 * Run before `page.goto` to `/login` (or any first navigation).
 *
 * - Pins next-intl to English (same key as `I18nProvider`).
 * - Clears {@link PW_RECOVERY_SESSION_STORAGE_KEY}: if left set, `/login` latches to
 *   password-recovery UI and **never mounts** `.login-supabase-auth`.
 */
export async function pinEnglishAppearance(page: Page): Promise<void> {
  const appVersion = readPackageJsonVersion();
  await page.addInitScript(
    ([localeKey, recoveryKey, changelogKey, version]) => {
      localStorage.setItem(localeKey, "en");
      localStorage.setItem(changelogKey, version);
      try {
        sessionStorage.removeItem(recoveryKey);
      } catch {
        /* ignore */
      }
    },
    [LS_APPEARANCE_LOCALE, PW_RECOVERY_SESSION_STORAGE_KEY, CHANGELOG_LAST_SEEN_STORAGE_KEY, appVersion] as [
      string,
      string,
      string,
      string,
    ],
  );
}
