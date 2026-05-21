// Centralised TanStack Query key factories for the company / contact / reminder
// / timeline / comment domains.
//
// Why this file exists (Phase 2 §4.3):
//   - Eliminates hard collisions where the same key was written with
//     incompatible payload shapes (e.g. `["contacts", id]` used by
//     `CompanyKpiCards` as `select("id, is_primary")` AND by
//     `LinkedContactsCard` as `select("*, companies(...)")`).
//   - Narrows over-broad invalidations: bare `["companies"]` previously wiped
//     list, dropdown, and stats caches in one call.
//   - Removes dead invalidations: `["company", id]` was invalidated from many
//     forms but never registered as a query. The typed factory makes orphaned
//     keys obvious.
//
// Migration policy:
//   - One feature module per PR. Keep reviews tight, rollback trivial.
//   - The Phase 1 keys (`["companies", pageIndex, ...]`, `["contacts", id]`,
//     `["reminders", id]`, etc.) remain valid until each call site is
//     migrated; both old and new keys coexist during the rollout.
//   - A pragmatic lint guard (`scripts/check-query-keys.mjs`, wired into
//     `lint-staged`) blocks NEW bare string-array keys for the four
//     centralised domains. See `docs/perf/query-keys.md` for details.
//
// All factory functions return `as const` tuples for type-safe matching with
// TanStack Query's prefix/exact invalidation APIs.

import type { CompaniesFilterGroup } from "@/lib/utils/company-filters-url-state";

// ---------------------------------------------------------------------------
// Companies
// ---------------------------------------------------------------------------

export type CompaniesListFiltersKey = {
  pageIndex: number;
  pageSize: number;
  activeFilters: Record<CompaniesFilterGroup, string[]>;
  waterFilter: string | null;
  sorting: { id: string; desc: boolean }[];
  sortExplicit: boolean;
  debouncedGlobalFilter: string;
};

export const companyKeys = {
  /** Root key for prefix invalidation across all company queries. */
  all: ["companies"] as const,
  /** Group key for any paginated/filtered list query. */
  lists: () => [...companyKeys.all, "list"] as const,
  /** Specific list page + filters tuple. */
  list: (filters: CompaniesListFiltersKey) =>
    [...companyKeys.lists(), filters] as const,
  /** Lightweight dropdown / autocomplete options (id + firmenname + kundentyp). */
  options: () => [...companyKeys.all, "options"] as const,
  /** Server-aggregated KPI strip (total / leads / won / value sum). */
  stats: () => [...companyKeys.all, "stats"] as const,
  /** Filter bucket facets from the `companies_filter_buckets` RPC. */
  filterOptions: () => [...companyKeys.all, "filter-options"] as const,
  /** Group key for any single-company detail query. */
  details: () => [...companyKeys.all, "detail"] as const,
  /** Single company by id. */
  detail: (id: string) => [...companyKeys.details(), id] as const,
  /** Semantic search badge user setting (per-user toggle). */
  semanticBadgeSetting: () => [...companyKeys.all, "semantic-badge-setting"] as const,
  /** Detail-page prev/next nav id list (encoded list URL state). */
  detailNavIds: (listStateKey: string) =>
    [...companyKeys.all, "detail-nav-ids", listStateKey] as const,
} as const;

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

export const contactKeys = {
  all: ["contacts"] as const,
  /** Global contact list (paginated). */
  lists: () => [...contactKeys.all, "list"] as const,
  list: (filters: unknown) => [...contactKeys.lists(), filters] as const,
  /** Per-company contact slice (typically full rows + joined company). */
  byCompany: (companyId: string) =>
    [...contactKeys.all, "by-company", companyId] as const,
  /**
   * Per-company KPI count used by `CompanyKpiCards` — a different projection
   * (id + is_primary) from `byCompany`. Distinct key prevents the collision
   * that Phase 1 left in place.
   */
  kpi: (companyId: string) => [...contactKeys.all, "kpi", companyId] as const,
  /** Stats strip on the contacts list page. */
  stats: () => [...contactKeys.all, "stats"] as const,
  /** Detail row for a single contact. */
  detail: (id: string) => [...contactKeys.all, "detail", id] as const,
} as const;

// ---------------------------------------------------------------------------
// Reminders
// ---------------------------------------------------------------------------

export const reminderKeys = {
  all: ["reminders"] as const,
  lists: () => [...reminderKeys.all, "list"] as const,
  list: (filters: unknown) => [...reminderKeys.lists(), filters] as const,
  /** Per-company reminder list shown in `RemindersCard` (user-scoped filter). */
  byCompany: (companyId: string) =>
    [...reminderKeys.all, "by-company", companyId] as const,
  /**
   * Per-company KPI count used by `CompanyKpiCards`. Same separation rationale
   * as `contactKeys.kpi` — different projection / filter than `byCompany`.
   */
  kpi: (companyId: string) => [...reminderKeys.all, "kpi", companyId] as const,
  /** Header bell badge count. */
  headerCount: () => [...reminderKeys.all, "header-count"] as const,
  detail: (id: string) => [...reminderKeys.all, "detail", id] as const,
} as const;

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

export const timelineKeys = {
  all: ["timeline"] as const,
  lists: () => [...timelineKeys.all, "list"] as const,
  list: (filters: unknown) => [...timelineKeys.lists(), filters] as const,
  /** Per-company timeline entries (used by `TimelineCard`). */
  byCompany: (companyId: string) =>
    [...timelineKeys.all, "by-company", companyId] as const,
} as const;

// ---------------------------------------------------------------------------
// Comments (companies-only today; key shape generalises to other entities).
// ---------------------------------------------------------------------------

export const commentKeys = {
  all: ["comments"] as const,
  forEntity: (entityType: "company", entityId: string) =>
    [...commentKeys.all, entityType, entityId] as const,
  attachmentsForEntity: (entityType: "company", entityId: string) =>
    [...commentKeys.all, entityType, entityId, "file-library"] as const,
} as const;

// ---------------------------------------------------------------------------
// Other small lookup keys used across the app.
// ---------------------------------------------------------------------------

export const userKeys = {
  current: () => ["user"] as const,
} as const;

export const profileKeys = {
  all: ["profiles"] as const,
} as const;

export const standortanalyseKeys = {
  all: ["standortanalysen"] as const,
  byCompany: (companyId: string) =>
    [...standortanalyseKeys.all, "by-company", companyId] as const,
} as const;
