# Testing strategy (Vitest + Playwright)

**Purpose:** Decide *where* to add tests and *how* coverage exclusions relate to E2E so new work stays consistent. The **quality gate** is `vitest.config.ts` (thresholds + `coverage.exclude`); this document explains the intent.

**Last updated:** April 29, 2026

---

## Principles

1. **Vitest** proves **logic, parsing, and branching** quickly — especially code that can be tested with **mocks** (Supabase, `embed`, etc.) without a browser or real project DB.
2. **Playwright** proves **real integration** — auth cookies, RLS-backed reads/writes, Next.js routing, and UI flows that are **expensive or misleading** to chase with unit coverage alone.
3. **Coverage %** is measured only on **included** files. Excluding a file does **not** remove risk; it means **another strategy** (usually E2E or manual QA) is expected. Every exclusion in `vitest.config.ts` should have a **short comment** stating why.

---

## When to add Vitest

**Prefer Vitest** for:

- **Pure functions** — validations (`src/lib/validations/**`), URL/state encoders, ranking/merge helpers, formatters.
- **Server modules testable with mocks** — e.g. `createServerSupabaseClient` mocked, `*.rpc` / query chains faked: search, list filters, comments actions, timeline insert, semantic search settings.
- **SMTP delivery without loading `createServerSupabaseClient`** — `src/lib/services/smtp-delivery.ts` is covered by [`smtp-delivery.test.ts`](../src/lib/services/smtp-delivery.test.ts) (mocked `createAdminClient` + `nodemailer.createTransport`) so the global branch threshold stays honest; `in-app-notifications.test.ts` mocks this module when testing notification inserts.
- **API route handlers** — thin JSON boundaries; assert status, Zod rejection, happy path with mocked service (example: `src/app/api/comment-attachments/upload/route.test.ts`).
- **Client helpers** — e.g. [`open-signed-storage-url.test.ts`](../src/lib/client/open-signed-storage-url.test.ts) (fetch vs `window.open` branching for attachment open behavior).
- **Regressions** — a bug fixed in lib code deserves a unit test so it does not return.

**Prefer extracting logic** from huge components into **testable helpers** rather than a 500-line `CompaniesTable` unit test. Test the helper; keep the component as wiring. **Reference layout:** `src/components/features/companies/use-companies-list-*.ts` (queries, URL sync, delete mutation, geocode batch, bulk delete, deep links) keeps `ClientCompaniesPage` mostly composition—add Vitest against a hook or extracted pure helper when behavior is non-trivial. Example: [`use-companies-list-delete-mutation.test.tsx`](../src/components/features/companies/use-companies-list-delete-mutation.test.tsx) (optimistic cache + rollback + soft-delete toast).

---

## When to add Playwright (E2E)

**Prefer E2E** for:

- **Auth and session** — login, redirects, `access-pending`, protected routes.
- **Critical user journeys** that touch **excluded** surfaces (large forms, company detail client, mass-email UI, CSV flows) — at least **one happy path** or **smoke** per area when that area ships or changes materially.
- **RLS / real Supabase** behavior Vitest cannot simulate honestly with a one-line mock.

**Spec layout:** `tests/e2e/` — keep **focused files** (`company-create`, `contacts-smoke`, …) instead of one unmaintainable mega-spec.

**Local / CI:** See `playwright.config.ts` and `docs/architecture.md` (Testing) for env vars (`E2E_*`), `loadEnvConfig`, and CI secrets.

**Playwright web server:** Non-CI runs start **`next dev --webpack`** when Playwright must spawn the app (port 3000 free). Turbopack’s default `next dev` can panic under parallel E2E workers; Webpack dev avoids that and still supports the app; **CI** uses **`next start`** after `pnpm build`. If you keep `pnpm dev` running on :3000, Playwright **reuses** it—prefer stopping it so the Webpack instance is used, or accept possible instability with Turbopack.

**Playwright workers:** `playwright.config.ts` sets **`workers: 1`** (local and CI). A single Next dev server cannot reliably serve **multiple parallel browsers** hitting protected routes; you will see **`net::ERR_ABORTED`** / navigation timeouts. Serial E2E is slower but matches what CI does.

**Translations in E2E-facing copy:** Mass-email and similar UIs that show literal `{{field}}` tokens in `src/messages/*.json` must use **ICU quoting** (`'{{vorname}}'` in the JSON string) so `t('key')` does not throw `INVALID_MESSAGE` / `MALFORMED_ARGUMENT`. See [next-intl escaping](https://next-intl.dev/docs/usage/messages#escaping).

---

## Coverage exclusions (what “wise” means)

Excluding files from **coverage** is acceptable when:

- The file is **mostly presentation** or **third-party-style wiring** (e.g. some shadcn primitives) and does not carry unique business rules.
- The file is **huge and branch-heavy** (e.g. TanStack column factories); risk is owned by **E2E smoke** + **manual** checks unless logic is **extracted and unit tested**.
- The file uses **service role**, **nodemailer**, or **batch** paths where unit tests would be **brittle**; still add **targeted** tests elsewhere (guard rails, smaller entry points) where possible.

Excluding files is **not** a substitute for tests if the code is **high-risk** (permissions, money, data loss). In those cases, add **E2E** or **narrow unit tests** around extracted logic.

---

## Decision cheat sheet

| Change | First choice | If not enough |
| --- | --- | --- |
| New Zod rule / parser | Vitest | — |
| New `lib/services` or `lib/utils` helper | Vitest | — |
| Server Action / API: branching + auth | Vitest (mocked Supabase + `getCurrentUser`) | E2E for RLS edge case |
| Large Client Component | E2E smoke or extract pure helper → Vitest | — |
| New excluded-area feature | E2E journey + comment in `coverage.exclude` if needed | — |

---

## Commands and thresholds

| Command | Role |
| --- | --- |
| `pnpm test:run` / `pnpm test:ci` | Vitest, no / with coverage |
| `pnpm test:coverage` | Coverage locally (same thresholds as CI) |
| `pnpm e2e` / `pnpm e2e:ci` | Playwright |

**Global thresholds** (see `vitest.config.ts`): statements and lines **85%**; branches and functions **80%**. Only **non-excluded** files count toward those percentages.

---

## CI

The **quality** job runs Vitest with coverage; the **e2e** job runs Playwright after a successful build. The workflow prints coverage totals for logs; thresholds are enforced by Vitest, not by the summary script.

---

## Related docs

- [`architecture.md`](architecture.md) — Testing section (commands, E2E setup, `src/test/setup.ts`)
- [`README.md`](../README.md) — Quick command table
- [`production-deploy.md`](production-deploy.md) — E2E in go-live checklist
