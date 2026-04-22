import { expect, test } from "@playwright/test";

test.describe("public / auth shell", () => {
  test("login page is reachable and shows the sign-in card", async ({ page }) => {
    await page.goto("/login");
    // Card title is a non-heading div; the Supabase form wrapper is stable for smoke.
    await expect(page.locator(".login-supabase-auth")).toBeVisible({ timeout: 20_000 });
  });

  test("root path redirects to login or dashboard (session-dependent)", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/(login|dashboard)/);
  });
});
