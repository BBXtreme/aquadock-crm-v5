import { expect, test } from "@playwright/test";

import { hasE2ECredentials, loginWithPassword } from "./helpers/auth";
import { pinEnglishAppearance } from "./helpers/locale";

const authDescribe = hasE2ECredentials() ? test.describe : test.describe.skip;

authDescribe("authenticated CRM smoke", () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeEach(async ({ page }) => {
    await pinEnglishAppearance(page);
  });

  test("login → companies → first company detail → mass email", async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL;
    const password = process.env.E2E_USER_PASSWORD;
    if (email === undefined || email === "" || password === undefined) {
      test.skip();
      return;
    }

    await loginWithPassword(page, email, password);
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

    await loginWithPassword(page, email, password);
    if (page.url().includes("access-pending")) {
      test.skip();
      return;
    }

    await page.goto("/profile");
    await expect(page).toHaveURL(/\/profile/);
  });
});
