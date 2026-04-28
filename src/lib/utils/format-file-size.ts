/**
 * Compact localized file-size label for UI chips.
 */
export function formatFileSizeBytes(bytes: number, locale: string): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "";
  }
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let u = 0;
  while (n >= 1024 && u < units.length - 1) {
    n /= 1024;
    u += 1;
  }
  const formatted =
    u === 0 ? String(Math.round(n)) : n.toLocaleString(locale, { maximumFractionDigits: 1 });
  return `${formatted} ${units[u]}`;
}
