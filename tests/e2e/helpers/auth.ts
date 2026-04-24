import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export function hasE2ECredentials(): boolean {
  return Boolean(process.env.E2E_USER_EMAIL?.trim() && process.env.E2E_USER_PASSWORD);
}

/**
 * After password sign-in, wait for a post-login route or fail if Supabase shows an error.
 */
export async function expectSignedInOrFail(page: Page): Promise<void> {
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

export async function loginWithPassword(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  // Supabase Auth UI often omits a proper label↔input association; use the form shell + types.
  const auth = page.locator(".login-supabase-auth");
  await expect(auth).toBeVisible({ timeout: 45_000 });
  const emailInput = auth.locator('input[type="email"], input[name="email"]').first();
  await expect(emailInput).toBeVisible({ timeout: 30_000 });
  await emailInput.fill(email);
  const passwordField = auth.locator('input[type="password"]');
  await expect(passwordField).toBeVisible();
  await passwordField.fill(password);
  await auth.locator('form button[type="submit"]').click();
  await expectSignedInOrFail(page);
}
