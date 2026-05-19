# Standortanalyse Scoring Contract

**Version:** 1.0  
**Last updated:** May 19, 2026  
**Scope:** scoring math, score persistence, and score presentation for `standortanalysen`

This document defines the non-negotiable scoring behavior. UI and wording may evolve, but these rules must remain stable unless this contract is version-bumped.

## Goal

Guarantee that score calculation is always correct, reproducible, and consistent across:

- wizard summary and dashboard
- API responses
- persisted database rows
- list/table views and emails

## Canonical Sources

- Criteria catalog and thresholds: `src/lib/standortanalyse/criteria.ts`
- Score engine: `src/lib/standortanalyse/scoring.ts`
- Score-row mapping: `src/lib/standortanalyse/persistence.ts`
- API write paths:
  - `src/app/api/standortanalyse/route.ts`
  - `src/app/api/standortanalyse/share/[token]/submit/route.ts`
- API read path: `src/app/api/standortanalyse/[id]/route.ts`

## Contract Rules

### 1) Total Score Rule

- `totalPoints` is the sum of all non-info criteria (`main` + `optional`) points.
- `info` criteria must never contribute to `totalPoints`.
- `maxPoints` is fixed at `135`.

### 2) Criteria Value Rule

- Every numeric criterion accepts only values declared in validation (`parseNumericEnum(...)`).
- Values outside criterion bounds are rejected by validation and clamped defensively in scoring.

### 2.1) Criteria and Allowed Point Values

- `gewaesserart` (info): no points; canonical labels from CRM `wassertyp` list (`Küste / Meer`, `Fluss`, `Badesee`, `See`, `Hafen`, `Bach`, `Kanal`, `Teich`, `Stausee`).
- `standortfrequentierung` (max 25): `25 | 18 | 10 | 0 | 1`.
- `gastronomie` (max 10): `10 | 6 | 3 | 0 | 1`.
- `bekanntheit` (max 15): `15 | 10 | 5 | 0 | 1`.
- `zugaenglichkeit` (max 10): `10 | 7 | 3 | 0 | 1`.
- `saisonlaenge` (max 10): `10 | 7 | 4 | 0 | 1`.
- `wassertemperatur` (max 5): `5 | 3 | 0 | 1`.
- `sonnenstunden` (max 5): `5 | 3 | 0 | 1`.
- `einwohner` (max 10): `10 | 7 | 4 | 0 | 1`.
- `besucherstatistiken` (max 5): `5 | 3 | 0 | 1`.
- `attraktivitaet` (max 12): `12 | 9 | 6 | 3 | 0 | 1`.
- `wettbewerb` (max 5): `5 | 3 | 0 | 1`.
- `wasserzugang` (max 5): `5 | 3 | 0 | 1`.
- `genehmigungslage` (max 5): `5 | 3 | 0 | 1`.
- `sichtbarkeit` (max 5): `5 | 3 | 0 | 1`.
- `erweiterbarkeit` (max 3): `3 | 2 | 0 | 1`.
- `lokalerPartner` (max 2): `2 | 0 | 1`.
- `marketingpotenzial` (max 3): `3 | 2 | 0 | 1`.

### 3) Unknown Rule

- Numeric value `1` means `Unbekannt` for criteria that support it.
- `unknownCount` equals the number of numeric criteria selected as `1`.
- Unknown handling must be explicit and consistent in all views (summary, dashboard, exports, API payload).

### 4) Recommendation Rule

Recommendation is derived only from `totalPoints` using thresholds:

- `>= 115`: `Premium-Standort`
- `>= 95`: `Sehr guter Standort`
- `>= 70`: `Guter Standort`
- `>= 50`: `Bedingt geeignet`
- `< 50`: `Unsicher`

### 5) Gewaesserart Rule

- `gewaesserart` is `type: "info"`, contributes `0` points, and must not affect recommendation.
- Its selected label must round-trip losslessly through persistence (including legacy data compatibility).

### 6) Persistence Consistency Rule

On every create/update/submit:

- `standortanalysen.total_points` must equal `calculateStandortScore(formData.kriterien).totalPoints`.
- `standortanalysen.recommendation` must equal score recommendation label.
- `standortanalyse_scores` rows must be fully replaced with rows derived from the same score result.

### 7) Read Consistency Rule

On load:

- form data reconstructed from persisted rows must recompute to the same `totalPoints` and recommendation as stored in `standortanalysen`.
- if they differ, this is a data integrity incident and must be surfaced (log + test failure path).

### 8) DB Contract Rule

- DB constraints for `standortanalyse_scores` must match application behavior.
- If app writes non-traffic-light values for info rows, schema must explicitly allow it, or app must store info labels elsewhere.
- Code and schema may never silently diverge.

## Acceptance Checks (Required)

The following checks are mandatory for any scoring-related change:

1. **Deterministic score fixtures**
   - known criteria payload -> exact `totalPoints`, `unknownCount`, recommendation
2. **Threshold boundary tests**
   - exact boundary checks for 50, 70, 95, 115
3. **Roundtrip test**
   - form -> score rows -> form -> score is identical
4. **Info criterion test**
   - changing `gewaesserart` never changes total or recommendation
5. **DB compatibility test**
   - inserted score rows conform to DB constraints
6. **Cross-view consistency test**
   - list/table totals and dashboard totals match persisted analysis for same `analysisId`

## Change Management

Any scoring logic change requires:

- contract version bump in this file
- migration notes in PR
- updated tests for affected rules
- clear mention of expected score deltas for existing analyses (if any)
