/** Accepts DB/JSON lat-lon as number or numeric string; rejects NaN. */
export function toFiniteLatLon(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Rejects bogus coordinates (e.g. microdegrees or corrupted imports). */
export function isWgs84Degrees(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

/** Validates coordinates: allows null (optional), rejects non-finite and out-of-range values. */
export function isValidCoordinate(lat: unknown, lon: unknown): boolean {
  const latNum = toFiniteLatLon(lat);
  const lonNum = toFiniteLatLon(lon);
  if (latNum === null && lonNum === null) return true; // Both null: optional coordinates
  if (latNum === null || lonNum === null) return false; // One null: invalid
  if (latNum === 0 || lonNum === 0) return false; // Reject any zero coordinate as likely placeholder
  return isWgs84Degrees(latNum, lonNum);
}
