#!/usr/bin/env node
/**
 * Phase 2 §4.3 — lightweight lint guard for raw TanStack Query string-array
 * keys in the four centralised domains (companies / contacts / reminders /
 * timeline).
 *
 * Why this script exists:
 *   - Hard collisions and over-broad invalidations are easy to reintroduce
 *     with bare keys like `queryKey: ["contacts", id]`.
 *   - A custom Biome plugin would solve this rigorously but is overkill for
 *     Phase 2. This script is the ten-line `ripgrep`-style alternative
 *     mentioned in the plan; promote to a Biome plugin in Phase 3 only if
 *     regressions persist despite this guard.
 *
 * Behaviour:
 *   - Runs under `lint-staged` against staged `.ts` / `.tsx` files (no scan
 *     of `node_modules`, `.next`, etc.).
 *   - Rejects new occurrences of `queryKey: ["companies"`, `queryKey: ["contacts"`,
 *     `queryKey: ["reminders"`, `queryKey: ["timeline"` outside the allow-list
 *     (the keys file itself and existing migrations-in-progress).
 *   - Empty argv → scans the whole `src/` tree (suitable for `pnpm check:query-keys`).
 *
 * Exit codes:
 *   0 — no offences (or all matches in the allow-list)
 *   1 — at least one disallowed bare-key occurrence
 */

import { readFileSync, statSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..");
const SRC_ROOT = join(REPO_ROOT, "src");

/**
 * Patterns we reject. Each entry matches a raw string-array TanStack Query key
 * that the centralised factories in `src/lib/query/keys.ts` are meant to
 * replace.
 */
const DISALLOWED_PATTERNS = [
  { domain: "companies", regex: /queryKey:\s*\[\s*"companies"/ },
  { domain: "contacts", regex: /queryKey:\s*\[\s*"contacts"/ },
  { domain: "reminders", regex: /queryKey:\s*\[\s*"reminders"/ },
  { domain: "timeline", regex: /queryKey:\s*\[\s*"timeline"/ },
];

/**
 * Files that are allowed to define / reference the bare keys directly.
 *
 *   - The factory module itself defines them.
 *   - Tests must be able to assert against the canonical keys.
 *   - Files being migrated in the same PR can be temporarily allow-listed by
 *     adding their relative path here; remove the entry once the migration
 *     lands.
 */
const ALLOW_LIST = new Set([
  "src/lib/query/keys.ts",
  // Existing call sites awaiting migration in follow-up PRs. Remove from the
  // allow-list as each PR lands.
  "src/components/features/companies/use-companies-list-queries.ts",
  "src/components/features/companies/use-companies-list-queries.test.ts",
  "src/components/features/companies/CompanyDetailClient.tsx",
  "src/components/features/companies/CompanyCreateForm.tsx",
  "src/components/features/companies/FirmendatenEditForm.tsx",
  "src/components/features/companies/AquaDockEditForm.tsx",
  "src/components/features/companies/AdresseEditForm.tsx",
  "src/components/features/companies/CompanyEditForm.tsx",
  "src/components/features/companies/ClientCompaniesPage.tsx",
  "src/components/features/companies/use-companies-list-delete-mutation.ts",
  "src/components/features/companies/use-companies-list-delete-mutation.test.tsx",
  "src/components/features/companies/use-companies-bulk-delete.ts",
  // Phase 2 §4.3 detail-page migration landed in this PR; the four card
  // components below now use the factory exports from `src/lib/query/keys.ts`.
  // CompanyKpiCards / LinkedContactsCard / RemindersCard / TimelineCard
  // intentionally removed from the allow-list — adding them back would mask
  // regressions.
  "src/components/features/companies/ai-enrichment/AIEnrichmentModal.tsx",
  "src/components/features/contacts/ClientContactsPage.tsx",
  "src/components/features/contacts/ContactEditForm.tsx",
  "src/components/features/contacts/ContactDetailClient.tsx",
  "src/components/features/reminders/ClientRemindersPage.tsx",
  "src/components/features/reminders/ReminderEditForm.tsx",
  "src/components/features/timeline/ClientTimelinePage.tsx",
  "src/components/tables/TimelineTable.tsx",
  "src/components/layout/Header.tsx",
  "src/components/features/reminders/ReminderCreateForm.tsx",
  "src/components/features/contacts/ContactCreateForm.tsx",
  "src/components/features/companies/use-companies-geocode-batch.ts",
  "src/components/features/map/useMapPopupActions.ts",
  "src/components/features/settings/ClientSettingsPage.tsx",
]);

const FILE_EXTENSIONS = new Set([".ts", ".tsx"]);

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  ".turbo",
  ".cursor",
  ".git",
]);

async function* walkSourceFiles(rootDir) {
  /** @type {string[]} */
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIR_NAMES.has(entry.name)) {
          stack.push(full);
        }
      } else if (entry.isFile() && FILE_EXTENSIONS.has(extname(entry.name))) {
        yield full;
      }
    }
  }
}

function scanContent(absPath, relPath) {
  /** @type {{ relPath: string; lineNumber: number; line: string; domain: string }[]} */
  const offences = [];
  let content;
  try {
    content = readFileSync(absPath, "utf8");
  } catch {
    return offences;
  }
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    for (const { domain, regex } of DISALLOWED_PATTERNS) {
      if (regex.test(line)) {
        offences.push({
          relPath,
          lineNumber: i + 1,
          line: line.trim(),
          domain,
        });
      }
    }
  }
  return offences;
}

function shouldScan(relPath) {
  if (!FILE_EXTENSIONS.has(extname(relPath))) {
    return false;
  }
  if (ALLOW_LIST.has(relPath)) {
    return false;
  }
  return true;
}

async function collectFilesFromArgv() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    /** @type {string[]} */
    const files = [];
    for await (const abs of walkSourceFiles(SRC_ROOT)) {
      files.push(abs);
    }
    return files;
  }
  return argv
    .map((arg) => resolve(REPO_ROOT, arg))
    .filter((abs) => {
      try {
        return statSync(abs).isFile();
      } catch {
        return false;
      }
    });
}

async function main() {
  const files = await collectFilesFromArgv();
  /** @type {ReturnType<typeof scanContent>} */
  const offences = [];
  for (const abs of files) {
    const rel = relative(REPO_ROOT, abs);
    if (!shouldScan(rel)) {
      continue;
    }
    offences.push(...scanContent(abs, rel));
  }
  if (offences.length === 0) {
    return;
  }
  console.error(
    "\n[query-keys] Found bare TanStack Query string-array keys for centralised domains.\n" +
      "Use the typed factories in src/lib/query/keys.ts instead (companyKeys / contactKeys / reminderKeys / timelineKeys).\n",
  );
  for (const offence of offences) {
    console.error(
      `  ${offence.relPath}:${offence.lineNumber}  [${offence.domain}]  ${offence.line}`,
    );
  }
  console.error(
    "\nIf this file is mid-migration, add it to ALLOW_LIST in scripts/check-query-keys.mjs " +
      "and remove the entry once the migration PR lands.\n",
  );
  process.exit(1);
}

main().catch((err) => {
  console.error("[query-keys] Unexpected error:", err);
  process.exit(1);
});
