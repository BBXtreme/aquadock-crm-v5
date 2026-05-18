type CountryOption = {
  value: string;
  label: string;
};

const FALLBACK_REGION_CODES = [
  "DE",
  "AT",
  "CH",
  "NL",
  "BE",
  "LU",
  "FR",
  "IT",
  "PL",
  "CZ",
  "DK",
  "SE",
  "NO",
  "FI",
  "ES",
  "PT",
  "HR",
  "SI",
  "RS",
  "BA",
  "GR",
  "CY",
  "ME",
  "GB",
  "IE",
  "US",
  "CA",
  "AU",
] as const;

function listRegionCodes(): string[] {
  const supportedValuesOf = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
  if (supportedValuesOf === undefined) {
    return [...FALLBACK_REGION_CODES];
  }
  try {
    const regions = supportedValuesOf("region");
    const normalized = regions.filter((code) => /^[A-Z]{2}$/.test(code));
    if (normalized.length > 0) {
      return normalized;
    }
  } catch {
    return [...FALLBACK_REGION_CODES];
  }
  return [...FALLBACK_REGION_CODES];
}

function getRegionLabel(locale: string, code: string): string {
  try {
    const displayNames = new Intl.DisplayNames([locale], { type: "region" });
    const label = displayNames.of(code);
    if (typeof label === "string" && label !== code) {
      return label;
    }
  } catch {
    return code;
  }
  return code;
}

export function getStandortLandOptions(locale = "de"): CountryOption[] {
  const codes = listRegionCodes();
  const options = codes.map((code) => ({
    value: code,
    label: getRegionLabel(locale, code),
  }));
  return options.sort((a, b) => a.label.localeCompare(b.label));
}
