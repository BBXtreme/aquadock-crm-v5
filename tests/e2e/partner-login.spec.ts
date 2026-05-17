import { expect, test } from "@playwright/test";

import { pinEnglishAppearance } from "./helpers/locale";

/**
 * Smoke tests for the public partner login surface.
 *
 * Authentication round-trip is intentionally covered as a unit test
 * (`src/app/auth/login/route.test.ts`) because creating real partner users in
 * Supabase per E2E run is expensive. Here we only assert the page renders, has
 * the branded markup, and rejects invalid credentials through the shared
 * `/auth/login` Route Handler.
 */
test.describe("partner login page", () => {
  test.beforeEach(async ({ page }) => {
    await pinEnglishAppearance(page);
  });

  test("renders the branded partner sign-in card", async ({ page }) => {
    await page.goto("/partner/login");

    await expect(
      page.getByRole("heading", {
        name: /(Sign in to Aquadock Partner|Bei Aquadock Partner anmelden)/i,
      }),
    ).toBeVisible({ timeout: 30_000 });

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^(Sign in|Anmelden)$/i }),
    ).toBeEnabled();

    await expect(page.getByText("Paddle. Live. Enjoy.").first()).toBeVisible();
  });

  test("shows inline error when credentials are invalid", async ({ page }) => {
    test.setTimeout(90_000);

    await page.goto("/partner/login");

    await page
      .locator('input[type="email"]')
      .fill("e2e-invalid-partner@example.invalid");
    await page.locator('input[type="password"]').fill("not-a-real-password");

    await page.getByRole("button", { name: /^(Sign in|Anmelden)$/i }).click();

    await expect(page).toHaveURL(/\/partner\/login/);
    const inlineAlert = page.locator('main p[role="alert"]');
    await expect(inlineAlert).toBeVisible({ timeout: 30_000 });
    await expect(inlineAlert).toContainText(
      /(Email or password is incorrect|E-Mail oder Passwort ist nicht korrekt)/i,
    );
  });
});
