import { expect, test } from "@playwright/test";

const hasCredentials = Boolean(
  process.env.E2E_USER_EMAIL?.trim() && process.env.E2E_USER_PASSWORD,
);

const authDescribe = hasCredentials ? test.describe : test.describe.skip;

/**
 * Exercises the protected shell, companies + detail (VItest-excluded client bundles), contacts,
 * and mass email — the same “CRM surface” called out in vitest `coverage.exclude`.
 * Requires `E2E_USER_EMAIL` and `E2E_USER_PASSWORD` in CI secrets (or `.env.local` locally).
 */
authDescribe("authenticated CRM smoke", () => {
  test("login → companies → first company detail → mass email", async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;
    if (email === undefined || email === "" || password === undefined) {
      test.skip();
      return;
    }

    await page.goto("/login");
    await page.getByLabel(/email|e-mail|mail/i).fill(email);
    const passwordField = page.locator('input[type="password"]');
    await expect(passwordField).toBeVisible();
    await passwordField.fill(password);
    const submit = page
      .getByRole("button", { name: /sign|anmeld|jetzt|magic|e-mail|send|continue|weiter|prijav/i })
      .first();
    await submit.click();
    await page.waitForURL(/\/(dashboard|companies|access-pending)/, { timeout: 45_000 });
    if (page.url().includes("access-pending")) {
      test.skip();
      return;
    }

    await page.goto("/companies");
    await expect(page).toHaveURL(/\/companies/);

    const firstCompany = page.locator('a[href^="/companies/"]').first();
    if ((await firstCompany.count()) > 0) {
      await firstCompany.click();
      await expect(page).toHaveURL(/\/companies\/[0-9a-f-]{36}/i);
    }

    await page.goto("/contacts");
    await expect(page).toHaveURL(/\/contacts/);

    await page.goto("/mass-email");
    await expect(page).toHaveURL(/\/mass-email/);
  });

  test("profile page loads (admin trash UI is optional)", async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;
    if (email === undefined || email === "" || password === undefined) {
      test.skip();
      return;
    }

    await page.goto("/login");
    await page.getByLabel(/email|e-mail|mail/i).fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page
      .getByRole("button", { name: /sign|anmeld|jetzt|magic|e-mail|send|continue|weiter|prijav/i })
      .first()
      .click();
    await page.waitForURL(/\/(dashboard|companies|access-pending)/, { timeout: 45_000 });
    if (page.url().includes("access-pending")) {
      test.skip();
    }

    await page.goto("/profile");
    await expect(page).toHaveURL(/\/profile/);
  });
});
