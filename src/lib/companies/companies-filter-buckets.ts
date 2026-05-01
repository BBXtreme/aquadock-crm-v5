/** Shape of `companies_filter_buckets` RPC payload (distinct values per facet). */
export const COMPANIES_FILTER_BUCKET_KEYS = ["status", "kundentyp", "firmentyp", "land", "wassertyp"] as const;

export type CompaniesFilterBucketKey = (typeof COMPANIES_FILTER_BUCKET_KEYS)[number];

export type CompaniesFilterDistinctBuckets = Record<CompaniesFilterBucketKey, Set<string>>;

function emptyCompaniesFilterBuckets(): CompaniesFilterDistinctBuckets {
  return {
    status: new Set(),
    kundentyp: new Set(),
    firmentyp: new Set(),
    land: new Set(),
    wassertyp: new Set(),
  };
}

/** Non-empty strings only (filters nullish / empty / non-string entries). */
export function nonEmptyStringsFromJson(value: unknown): Set<string> {
  if (!Array.isArray(value)) {
    return new Set();
  }
  return new Set(value.filter((v): v is string => typeof v === "string" && v.length > 0));
}

/**
 * Normalizes `companies_filter_buckets` RPC `data`. Caller must reject on RPC `error` before calling.
 */
export function companiesFilterBucketsFromRpcData(data: unknown): CompaniesFilterDistinctBuckets {
  const payload = data as Record<string, unknown> | null;
  if (payload === null || typeof payload !== "object") {
    return emptyCompaniesFilterBuckets();
  }
  const result = emptyCompaniesFilterBuckets();
  for (const key of COMPANIES_FILTER_BUCKET_KEYS) {
    result[key] = nonEmptyStringsFromJson(payload[key]);
  }
  return result;
}
