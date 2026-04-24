import { expect, test } from "@playwright/test";

import { hasE2ECredentials, loginWithPassword } from "./helpers/auth";
import { pinEnglishAppearance } from "./helpers/locale";

const authDescribe = hasE2ECredentials() ? test.describe : test.describe.skip;

authDescribe("contacts smoke", () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeEach(async ({ page }) => {
    await pinEnglishAppearance(page);
  });

  test("opens create contact dialog", async ({ page }) => {
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

    await page.goto("/contacts");
    await expect(
      page.getByRole("heading", { name: /^(Contacts|Kontakte|Kontakti)$/, level: 1 }),
    ).toBeVisible();

    await page.getByRole("main").getByRole("button", { name: /^(Contact|Kontakt)$/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: /^(Create new contact|Neuen Kontakt erstellen|Stvori novi kontakt)$/,
      }),
    ).toBeVisible();
  });
});
