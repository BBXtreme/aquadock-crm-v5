import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

// Playwright does not read `.env.local` by default; Next.js does. Load repo env so
// E2E_USER_EMAIL / E2E_USER_PASSWORD / E2E_BASE_URL work when running `pnpm e2e` locally.
loadEnvConfig(process.cwd());

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const inCi = process.env.CI === "true";

/**
 * E2E — auth + company/contact/mass-email smoke (see `tests/e2e/`).
 * Deep paths excluded from Vitest coverage (company detail, crm actions) are exercised here in CI.
 *
 * Local runs use `next dev` so `NEXT_PUBLIC_*` from `.env.local` apply without a rebuild; CI uses
 * `next start` after `pnpm build` with env vars from the workflow.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: !inCi,
  forbidOnly: inCi,
  retries: inCi ? 1 : 0,
  workers: inCi ? 1 : undefined,
  reporter: inCi ? [["github"], ["list"]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: inCi
      ? "pnpm exec next start -H 127.0.0.1 -p 3000"
      : "NODE_OPTIONS=\"--max-old-space-size=8192\" pnpm exec next dev -H 127.0.0.1 -p 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !inCi,
    timeout: 120_000,
  },
});
