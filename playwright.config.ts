import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

// Playwright does not read `.env.local` by default; Next.js does. Load repo env so
// E2E_USER_EMAIL / E2E_USER_PASSWORD / E2E_BASE_URL work when running `pnpm e2e` locally.
loadEnvConfig(process.cwd());

// Prefer localhost over 127.0.0.1 (and LAN IPs like 192.168.x.x): one stable origin, fewer OS/firewall issues.
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const inCi = process.env.CI === "true";

/**
 * E2E — auth + company/contact/mass-email smoke (see `tests/e2e/`).
 * Deep paths excluded from Vitest coverage (company detail, crm actions) are exercised here in CI.
 *
 * Local runs: start `pnpm dev` (or let Playwright start `next dev` when no server is listening). Use
 * the same host as this baseURL — default `http://localhost:3000` matches `next dev` on localhost.
 * CI uses `next start` after `pnpm build` with env vars from the workflow.
 */
export default defineConfig({
  // Default 30s is shorter than some expect() timeouts (e.g. 60s) — the test is aborted first.
  timeout: 90_000,
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
      ? "pnpm exec next start -H localhost -p 3000"
      : "NODE_OPTIONS=\"--max-old-space-size=8192\" pnpm exec next dev -H localhost -p 3000",
    url: "http://localhost:3000",
    reuseExistingServer: !inCi,
    timeout: 120_000,
  },
});
