/**
 * Pure semver comparison for `major.minor.patch` strings (no prerelease/build).
 * Returns `null` if either string is not a valid semver triple.
 */

const SEMVER_PARTS = 3;

export function parseSemver(input: string): [number, number, number] | null {
  const trimmed = input.trim();
  const parts = trimmed.split(".");
  if (parts.length !== SEMVER_PARTS) {
    return null;
  }
  const nums: number[] = [];
  for (const p of parts) {
    if (p === "" || !/^\d+$/.test(p)) {
      return null;
    }
    const n = Number.parseInt(p, 10);
    if (Number.isNaN(n)) {
      return null;
    }
    nums.push(n);
  }
  const a = nums[0];
  const b = nums[1];
  const c = nums[2];
  if (a === undefined || b === undefined || c === undefined) {
    return null;
  }
  return [a, b, c];
}

/**
 * @returns `-1` if `a < b`, `0` if equal, `1` if `a > b`, `null` if either operand is invalid.
 */
export function compareSemver(a: string, b: string): -1 | 0 | 1 | null {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (pa === null || pb === null) {
    return null;
  }
  for (let i = 0; i < SEMVER_PARTS; i++) {
    const da = pa[i];
    const db = pb[i];
    if (da === undefined || db === undefined) {
      return null;
    }
    if (da < db) {
      return -1;
    }
    if (da > db) {
      return 1;
    }
  }
  return 0;
}
