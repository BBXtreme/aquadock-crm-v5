import { expect, test } from "@playwright/test";

import { pinEnglishAppearance } from "./helpers/locale";

test.describe("public / auth shell", () => {
  test("login page is reachable and shows the sign-in card", async ({ page }) => {
    await pinEnglishAppearance(page);
    await page.goto("/login");
    const auth = page.locator(".login-supabase-auth");
    await expect(auth).toBeVisible({ timeout: 60_000 });
    await expect(auth.locator('input[type="email"], input[name="email"]').first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test("root path redirects to login or dashboard (session-dependent)", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/(login|dashboard)/);
  });
});
