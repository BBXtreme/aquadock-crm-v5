# Standortanalyse module

**Last updated:** May 18, 2026

This page documents the Standortanalyse feature shipped on branch `standort`: internal wizard workflow, public share flow, saved analyses table behavior, and CRM sync options.

For non-negotiable scoring and persistence invariants, see [`standortanalyse-scoring-contract.md`](standortanalyse-scoring-contract.md).

## Routes

- Internal page: `src/app/(protected)/standortanalyse/page.tsx` (`/standortanalyse`)
- Public share page: `src/app/standortanalyse/share/[token]/page.tsx`
- Main UI component: `src/components/features/standortanalyse/StandortanalyseWizard.tsx`

## Internal page structure

The wizard is rendered as accordion sections in this order:

1. `Kontext & Ziel der Analyse`
2. `Analyse ausfuellen`
3. `Kunden-Einladungslink`
4. `Gespeicherte Analysen`

### Analyse ausfuellen (active form)

- `Entwurf speichern` saves current form values to `standortanalysen`.
- `Neu starten` resets active form state and clears `analysisId`.
- The section header shows `Aktive Analyse: <id>` when a saved analysis is loaded.

### Gespeicherte Analysen (separate from active form)

Rendered with shared `DataTable` infrastructure via:

- `src/components/tables/StandortanalysenTable.tsx`
- `src/components/ui/data-table.tsx`

Per-row action icons (each with `AlertDialog` confirmation):

- `Ansehen` (Eye): opens summary/evaluation view
- `Bearbeiten` (Pencil): opens the form at step 1
- `Im CRM uebernehmen` (Contact icon): opens options dialog
- `Loeschen` (Trash): deletes analysis row

## PDF export (internal only)

PDF export is available only in internal mode on step 4 (`Auswertung`) after either:

- submitting a new analysis, or
- opening an existing submitted analysis via `Ansehen`

Implementation details:

- The result layout is rendered by `src/components/features/standortanalyse/StandortanalyseReport.tsx`.
- Action buttons are rendered by `src/components/features/standortanalyse/StandortanalyseReportActions.tsx`.
- Export hook `src/lib/client/use-standortanalyse-report-export.ts` supports:
  - `PDF herunterladen` (`html2canvas-pro` + `jspdf`)
  - `Drucken` (`window.print`)
- Static map image URL for export/print is generated via `src/lib/standortanalyse/static-map-url.ts`.
- Public share flow intentionally has no export actions.

## CRM import options

Inside `Im CRM uebernehmen`, users can choose:

- `Kontakt erstellen/aktualisieren`
- `Firma erstellen/aktualisieren`

Rules:

- At least one option must be selected (confirm button disabled otherwise).
- If both are selected, contact and company are created/updated and linked.
- If one is selected, only that side is synced and linked on the analysis row.

Implementation path:

- Table callback: `onSyncCrm(id, { createContact, createCompany })`
- Wizard mutation: `syncCrmMutation` in `StandortanalyseWizard.tsx`
- API handler: `POST /api/standortanalyse` in `src/app/api/standortanalyse/route.ts`

## Public share flow

### Internal share management

- Create share links in `Kunden-Einladungslink`
- Optional password protection
- Optional invite email sending
- Last share-link metadata fetch (`GET /api/standortanalyse/share?analysisId=...`)

### Public access and submit

- Validate link: `GET /api/standortanalyse/share/[token]`
- Submit shared form: `POST /api/standortanalyse/share/[token]/submit`
- Password-protected links require password on submit
- Submit endpoint includes simple rate limit and optional CRM entity sync for owner

## API surface

### `src/app/api/standortanalyse/route.ts`

- `GET`: list analyses for current user
- `POST`: create/update draft or submit analysis
  - Supports CRM sync flags:
    - `createOrUpdateContact?: boolean`
    - `createOrUpdateCompany?: boolean`
    - `syncCrmEntities?: boolean` (legacy/umbrella behavior)

### `src/app/api/standortanalyse/[id]/route.ts`

- `GET`: load one analysis + score rows and map to form
- `DELETE`: remove one analysis (owner-scoped)

### Share endpoints

- `GET/POST /api/standortanalyse/share`
- `GET /api/standortanalyse/share/[token]`
- `POST /api/standortanalyse/share/[token]/submit`

## Database tables

Defined in `supabase/migrations/20260518174000_standortanalyse.sql`:

- `standortanalysen`
- `standortanalyse_scores`
- `standortanalyse_share_links`

Relations:

- `standortanalysen.contact_id -> contacts.id`
- `standortanalysen.company_id -> companies.id`
- Child tables cascade from `standortanalysen.id`

## Tests

Key module tests:

- `src/app/api/standortanalyse/route.test.ts`
- `src/app/api/standortanalyse/[id]/route.test.ts`
- `src/app/api/standortanalyse/share/route.test.ts`
- `src/app/api/standortanalyse/share/[token]/submit/route.test.ts`
- `src/components/tables/StandortanalysenTable.test.tsx`
- `src/lib/standortanalyse/*.test.ts`
