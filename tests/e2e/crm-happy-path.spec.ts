import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const hasCredentials = Boolean(
  process.env.E2E_USER_EMAIL?.trim() && process.env.E2E_USER_PASSWORD,
);

const authDescribe = hasCredentials ? test.describe : test.describe.skip;

/**
 * After password sign-in, wait for a post-login route or fail if Supabase shows an error.
 * Avoids the default 30s test timeout while waitForURL was 45s; fails fast on invalid credentials.
 */
async function expectSignedInOrFail(page: Page) {
  const postLogin = /\/(dashboard|companies|access-pending)/;
  const handle = await page.waitForFunction(
    () => {
      const path = document.location.pathname;
      if (path === "/access-pending" || path === "/dashboard" || path.startsWith("/companies")) {
        return "ok" as const;
      }
      const text = document.body?.innerText ?? "";
      if (
        /Invalid login credentials|invalid.*credential|Invalid email or password|wrong password|Anmeldefehler|fehlgeschlagen|ungültig|ungültige Anmeldeinformationen|Netočn/i.test(
          text,
        )
      ) {
        return "err" as const;
      }
      return null;
    },
    { timeout: 60_000 },
  );
  const result = (await handle.jsonValue()) as "ok" | "err" | null;

  if (result === "err") {
    throw new Error(
      "Supabase rejected sign-in. Set E2E_USER_EMAIL and E2E_USER_PASSWORD to match a real Supabase Auth user (update the password in the Supabase dashboard if needed).",
    );
  }
  if (result !== "ok") {
    throw new Error(
      "Timed out after sign-in. Expected redirect to /dashboard, /companies, or /access-pending. Last URL: " +
        (await page.url()),
    );
  }
  await expect(page).toHaveURL(postLogin);
}

/**
 * Exercises the protected shell, companies + detail (VItest-excluded client bundles), contacts,
 * and mass email — the same “CRM surface” called out in vitest `coverage.exclude`.
 * Requires `E2E_USER_EMAIL` and `E2E_USER_PASSWORD` in CI secrets (or `.env.local` locally).
 */
authDescribe("authenticated CRM smoke", () => {
  test.describe.configure({ timeout: 90_000 });

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
    const signIn = page
      .getByRole("button", { name: /^(Sign in|Anmelden|Prijavi se|Continue)$/i });
    await signIn.click();
    await expectSignedInOrFail(page);
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
    await page.getByRole("button", { name: /^(Sign in|Anmelden|Prijavi se|Continue)$/i }).click();
    await expectSignedInOrFail(page);
    if (page.url().includes("access-pending")) {
      test.skip();
    }

    await page.goto("/profile");
    await expect(page).toHaveURL(/\/profile/);
  });
});
