import { expect, test } from "@playwright/test";

import { hasE2ECredentials, loginWithPassword } from "./helpers/auth";
import { pinEnglishAppearance } from "./helpers/locale";

const authDescribe = hasE2ECredentials() ? test.describe : test.describe.skip;

authDescribe("mass email UI", () => {
  test.describe.configure({ timeout: 90_000 });

  test.beforeEach(async ({ page }) => {
    await pinEnglishAppearance(page);
  });

  test("shows recipients, composer, and log link", async ({ page }) => {
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

    await page.goto("/mass-email");
    await expect(
      page.getByRole("heading", { name: /^(Mass email|Massen-E-Mail|Masovna e-pošta)$/, level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByText(
        /^(Send professional campaigns|Professionelle Kampagnen versenden|Šaljite profesionalne kampanje)$/,
      ),
    ).toBeVisible();

    await expect(page.getByText(/^(Recipients|Empfänger|Primatelji)$/)).toBeVisible();
    const main = page.getByRole("main");
    await expect(main.getByRole("button", { name: /^(Contacts|Kontakte|Kontakti)$/ })).toBeVisible();
    await expect(main.getByRole("button", { name: /^(Companies|Firmen|Tvrtke)$/ })).toBeVisible();

    await expect(page.getByText(/^(Compose email|E-Mail erstellen|Sastavi e-poštu)$/)).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: /^(View send log|Versandlog ansehen|Pogledaj zapis slanja)$/,
      }),
    ).toBeVisible();
  });
});
