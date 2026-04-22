import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const inCi = process.env.CI === "true";

/**
 * E2E — auth + company/contact/mass-email smoke (see `tests/e2e/`).
 * Deep paths excluded from Vitest coverage (company detail, crm actions) are exercised here in CI.
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
    command: "pnpm exec next start -H 127.0.0.1 -p 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !inCi,
    timeout: 120_000,
  },
});
