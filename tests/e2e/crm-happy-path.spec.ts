import { expect, test } from "@playwright/test";

import { hasE2ECredentials, loginWithPassword } from "./helpers/auth";
import { waitForNextDevReady } from "./helpers/dev-ready";
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

    await page.goto("/companies", { waitUntil: "domcontentloaded" });
    await waitForNextDevReady(page);
    await expect(page).toHaveURL(/\/companies/, { timeout: 25_000 });

    const firstCompany = page.locator('a[href^="/companies/"]').first();
    if ((await firstCompany.count()) > 0) {
      await firstCompany.click();
      await expect(page).toHaveURL(/\/companies\/[0-9a-f-]{36}/i, { timeout: 25_000 });
      await waitForNextDevReady(page);
    }

    await page.goto("/contacts", { waitUntil: "domcontentloaded" });
    await waitForNextDevReady(page);
    await expect(page).toHaveURL(/\/contacts/, { timeout: 25_000 });

    await page.goto("/mass-email", { waitUntil: "domcontentloaded" });
    await waitForNextDevReady(page);
    await expect(page).toHaveURL(/\/mass-email/, { timeout: 25_000 });
  });

  test("profile page loads", async ({ page }) => {
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

    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    await waitForNextDevReady(page);
    await expect(page).toHaveURL(/\/profile/, { timeout: 25_000 });
  });

  test("admin root redirects for admins or denies non-admins", async ({ page }) => {
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

    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await waitForNextDevReady(page);
    await expect(page).toHaveURL(/\/admin\/users|\/unauthorized/, { timeout: 25_000 });
  });
});
