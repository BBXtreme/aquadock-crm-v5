import { expect, test } from "@playwright/test";

import { pinEnglishAppearance } from "./helpers/locale";

test.describe("auth edge cases", () => {
  test.beforeEach(async ({ page }) => {
    await pinEnglishAppearance(page);
  });

  test("rejects invalid credentials with an error message", async ({ page }) => {
    test.setTimeout(90_000);

    await page.goto("/login");
    const auth = page.locator(".login-supabase-auth");
    await expect(auth).toBeVisible({ timeout: 30_000 });
    await expect(auth.locator("form")).toBeVisible({ timeout: 30_000 });

    const emailInput = auth.locator('input[type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 15_000 });
    await emailInput.fill("e2e-invalid-user@example.invalid");

    const passwordInput = auth.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill("not-a-real-password");

    await auth.locator('form button[type="submit"]').click();

    await expect(page).toHaveURL(/\/login/);
    await expect(auth).toBeVisible();

    // Supabase `signInError.message` (e.g. "Invalid login credentials") via Auth UI `<Message>`.
    await expect(auth).toContainText(
      /Invalid|invalid|credential|fehlgeschlagen|wrong|Anmelde|ungültig|Netočn|Unable|rate|limit|error|failed|mislu|neuspjelo/i,
      { timeout: 45_000 },
    );
  });
});
