import type { Page } from "@playwright/test";

/**
 * Local `next dev` can still be compiling when Playwright clicks. Waits for the
 * Next.js dev overlay "Compiling" indicator to disappear before interactions.
 */
export async function waitForNextDevReady(page: Page, timeoutMs = 60_000): Promise<void> {
  const compiling = page.getByText(/^Compiling/i);
  try {
    if (await compiling.isVisible({ timeout: 2_000 })) {
      await compiling.waitFor({ state: "hidden", timeout: timeoutMs });
    }
  } catch {
    /* overlay not shown — page is ready */
  }
}
