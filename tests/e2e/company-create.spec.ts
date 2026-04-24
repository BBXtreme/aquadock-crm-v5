import { expect, test } from "@playwright/test";

import { hasE2ECredentials, loginWithPassword } from "./helpers/auth";
import { pinEnglishAppearance } from "./helpers/locale";

const authDescribe = hasE2ECredentials() ? test.describe : test.describe.skip;

/**
 * Exercises CompanyCreateForm (Vitest coverage exclude) against real Supabase RLS.
 */
authDescribe("company create", () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }) => {
    await pinEnglishAppearance(page);
  });

  test("creates a company from the dialog and shows it in search", async ({ page }) => {
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
    await expect(
      page.getByRole("heading", { name: /^(Companies|Unternehmen|Tvrtke)$/, level: 1 }),
    ).toBeVisible();

    await page
      .getByRole("main")
      .getByRole("button", { name: /^(Company|Unternehmen|Tvrtka)$/ })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();

    const uniqueName = `E2E-${Date.now()}`;
    await page.getByLabel("Firmenname").fill(uniqueName);
    await page.getByRole("button", { name: "Speichern" }).click();

    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 30_000 });
    await expect(page.getByText("Unternehmen erfolgreich angelegt")).toBeVisible({ timeout: 15_000 });

    const search = page.getByRole("main").getByRole("searchbox");
    await search.fill(uniqueName);
    await expect(page.getByText(uniqueName, { exact: true }).first()).toBeVisible({ timeout: 25_000 });

    // List index URLs are `/companies?q=...`; row links to detail are `/companies/{uuid}...`.
    // Scope to main + list detail href so we do not match another link with the same visible name.
    const companyDetailLink = page
      .getByRole("main")
      .locator('a[href^="/companies/"]')
      .getByText(uniqueName, { exact: true });
    await companyDetailLink.click();
    await expect(page).toHaveURL(/\/companies\/[0-9a-f-]{36}/i, { timeout: 20_000 });
    await expect(page.getByRole("heading", { level: 1, name: uniqueName })).toBeVisible({ timeout: 20_000 });
  });
});
