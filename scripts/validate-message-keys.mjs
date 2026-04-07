#!/usr/bin/env node
/**
 * Ensures en.json and hr.json have the same key tree as de.json (source of truth).
 * Run: node scripts/validate-message-keys.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const messagesDir = join(__dirname, "..", "src", "messages");

/** @param {unknown} value */
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * @param {Record<string, unknown>} obj
 * @param {string} prefix
 * @returns {Set<string>}
 */
function collectKeys(obj, prefix = "") {
  const keys = new Set();
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (isPlainObject(v)) {
      for (const sub of collectKeys(/** @type {Record<string, unknown>} */ (v), path)) {
        keys.add(sub);
      }
    } else {
      keys.add(path);
    }
  }
  return keys;
}

function loadLocale(name) {
  const raw = readFileSync(join(messagesDir, `${name}.json`), "utf8");
  return JSON.parse(raw);
}

function main() {
  const de = loadLocale("de");
  const en = loadLocale("en");
  const hr = loadLocale("hr");

  const deKeys = collectKeys(de);
  const enKeys = collectKeys(en);
  const hrKeys = collectKeys(hr);

  const missingInEn = [...deKeys].filter((k) => !enKeys.has(k)).sort();
  const extraInEn = [...enKeys].filter((k) => !deKeys.has(k)).sort();
  const missingInHr = [...deKeys].filter((k) => !hrKeys.has(k)).sort();
  const extraInHr = [...hrKeys].filter((k) => !deKeys.has(k)).sort();

  let failed = false;
  if (missingInEn.length > 0) {
    failed = true;
    console.error("en.json missing keys (present in de.json):");
    for (const k of missingInEn) console.error(`  - ${k}`);
  }
  if (extraInEn.length > 0) {
    failed = true;
    console.error("en.json extra keys (not in de.json):");
    for (const k of extraInEn) console.error(`  - ${k}`);
  }
  if (missingInHr.length > 0) {
    failed = true;
    console.error("hr.json missing keys (present in de.json):");
    for (const k of missingInHr) console.error(`  - ${k}`);
  }
  if (extraInHr.length > 0) {
    failed = true;
    console.error("hr.json extra keys (not in de.json):");
    for (const k of extraInHr) console.error(`  - ${k}`);
  }

  if (failed) {
    console.error("\nMessage key parity check failed (de.json is the reference).");
    process.exit(1);
  }

  console.log(`OK: en.json and hr.json match de.json (${deKeys.size} leaf keys).`);
}

main();
