---
name: Reminder company combobox
overview: Add a shadcn-style searchable company picker (Popover + Command) with a one-click clear action for reminder create/edit, keeping company required at submit (option A). Reuse one shared component and align data loading with ordered queries.
todos:
  - id: add-popover
    content: Add shadcn Popover primitive (popover.tsx + radix dep if missing)
    status: completed
  - id: company-combobox
    content: Implement ReminderCompanyCombobox (Popover+Command, clear button, controlled value)
    status: completed
  - id: wire-forms
    content: Swap company field in ReminderCreateForm + ReminderEditForm; add .order on companies query
    status: completed
  - id: i18n
    content: Add reminders strings (search, empty, clear aria) in en/de/hr + validate keys
    status: completed
  - id: tests
    content: Adjust ReminderForm tests + mocks for combobox and ordered query
    status: completed
isProject: false
---

# Reminder company picker + clear (1–3)

## Goals

- **(1) Clear / “unlink”:** When `company_id` is set, expose a control that sets it to `""` so the user must pick again before submit. No change to backend: `company_id` stays required on save ([`reminder-server-action.ts`](src/lib/actions/reminder-server-action.ts) UUID).
- **(2) Scalable UX:** Replace the long `Select` with a **combobox**: searchable list suitable for hundreds of companies.
- **(3) Controlled RHF:** Drive the picker with `value` / `onChange` from `FormField` so `setValue`, validation, and preselection stay in sync (fixes the weak `defaultValue`-only pattern in [`ReminderCreateForm.tsx`](src/components/features/reminder/ReminderCreateForm.tsx)).

## Dependency / primitive

- The repo has [`command.tsx`](src/components/ui/command.tsx) but **no** [`popover`](src/components/ui/popover.tsx). Add the shadcn **Popover** primitive (`pnpm dlx shadcn@latest add popover` per [`components.json`](components.json)) so the combobox matches the usual shadcn recipe (Popover + Command, not a full Dialog for an inline form field).

## New shared UI

- Add something like **`ReminderCompanyCombobox`** (or generic `CompanyCombobox`) under e.g. [`src/components/features/reminder/`](src/components/features/reminder/) (or `src/components/ui/` if you prefer reuse outside reminders later).
- **API:** `value: string` (UUID or `""`), `onValueChange: (id: string) => void`, `companies: { id: string; firmenname: string }[]`, `disabled?: boolean`, optional `placeholder` / i18n passed in.
- **Behavior:**
  - Trigger: full-width outline `Button` showing selected `firmenname` or placeholder; `ChevronDown` + **clear** icon button (`X` or `Link2Off`) visible only when `value` is non-empty; clear uses `type="button"` and `stopPropagation` / `preventDefault` so it does not open the popover.
  - Popover content: `Command` with `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem`; `value` on items should include `firmenname` (and id) so **cmdk** client-side filter works.
  - On select: set id, close popover (`open` state).
  - **Accessibility:** trigger `aria-expanded`, clear button `aria-label` from i18n.
- **Performance (hundreds):** Phase 1 — keep a single `useQuery(["companies"], …)` but add **`.order("firmenname", { ascending: true })`** in both create and edit (and match the mock chain in tests) so the list is stable and scannable. cmdk filters without rendering a separate `SelectItem` per row in a native select; if profiling later shows lag with 500+ DOM nodes, Phase 2 would be debounced `.ilike` + `shouldFilter={false}` (not in initial scope unless you want it now).

## Integrate into forms

- [`ReminderCreateForm.tsx`](src/components/features/reminder/ReminderCreateForm.tsx): Replace `company_id` `FormField` `Select` with the combobox; keep existing `preselectedCompanyId` `useEffect` + `setValue`.
- [`ReminderEditForm.tsx`](src/components/features/reminder/ReminderEditForm.tsx): Same replacement for consistency (same scalability issue today).

## i18n

- Extend `reminders` namespace in [`src/messages/en.json`](src/messages/en.json), [`de.json`](src/messages/de.json), [`hr.json`](src/messages/hr.json) with keys e.g. `formCompanySearchPlaceholder`, `formCompanyEmpty`, `formCompanyClear` (and use [`scripts/validate-message-keys.mjs`](scripts/validate-message-keys.mjs) via `pnpm messages:validate` after edits).

## Tests

- Update [`ReminderForm.test.tsx`](src/components/features/reminders/ReminderForm.test.tsx) (and any create-form tests if present): interactions change from `Select` to opening popover, typing in command input, choosing item, and optionally asserting clear resets `company_id`. Extend the mocked `companies` `from().select().is()` chain if the query adds `.order()`.

## Out of scope (explicit)

- Optional `company_id` / reminders without company (backend + schema).
- Timeline / other forms (can reuse the same combobox component later).
