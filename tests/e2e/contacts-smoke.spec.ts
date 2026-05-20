import { expect, test } from "@playwright/test";

import { hasE2ECredentials, loginWithPassword } from "./helpers/auth";
import { waitForNextDevReady } from "./helpers/dev-ready";
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

    await page.goto("/contacts?create=true", { waitUntil: "domcontentloaded" });
    await waitForNextDevReady(page);

    const listPageH1 = page.locator("main h1").first();
    await expect(listPageH1).toBeVisible({ timeout: 25_000 });
    await expect(listPageH1).toHaveText(/^(Contacts|Kontakte|Kontakti)$/);

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(
      dialog.getByRole("heading", {
        name: /^(Create new contact|Neuen Kontakt erstellen|Stvori novi kontakt)$/,
      }),
    ).toBeVisible();
  });
});
