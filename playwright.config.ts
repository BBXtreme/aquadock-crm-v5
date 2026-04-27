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
 * Local runs: Playwright starts `next dev --webpack` (not Turbopack) when no server is listening.
 * Default `next dev` in Next 16 uses Turbopack, which can panic under parallel E2E load and then
 * navigations fail with `net::ERR_ABORTED`. `next start` in CI is already Turbopack-free.
 * Reusing an already-running `pnpm dev` (Turbopack) is unchanged — stop it first for a stable E2E run.
 * **Workers:** use `workers: 1` locally (same as CI). A single `next dev --webpack` process is easily
 * overloaded by the default multi-worker run (`ERR_ABORTED` / `net::ERR_CONNECTION_*` on `page.goto`).
 * Use the same host as this baseURL; default is `http://localhost:3000`.
 */
export default defineConfig({
  // Default 30s is shorter than some expect() timeouts (e.g. 60s) — the test is aborted first.
  timeout: 90_000,
  testDir: "./tests/e2e",
  fullyParallel: !inCi,
  forbidOnly: inCi,
  retries: inCi ? 1 : 0,
  // Local + CI: one worker. Parallel runs against one dev server cause flaky ERR_ABORTED (see e2e docs).
  workers: 1,
  reporter: inCi ? [["github"], ["list"]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: inCi
      ? "pnpm exec next start -H localhost -p 3000"
      : "NODE_OPTIONS=\"--max-old-space-size=8192\" pnpm exec next dev --webpack -H localhost -p 3000",
    url: "http://localhost:3000",
    reuseExistingServer: !inCi,
    timeout: 120_000,
  },
});
