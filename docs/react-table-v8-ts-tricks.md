# TanStack Table v8 — TypeScript patterns (AquaDock CRM)

**Last updated:** April 2026  
**Package:** `@tanstack/react-table` (see `package.json` for exact version).

---

## Why this document exists

Tables in TypeScript often show **long, scary errors** even when the UI works. The cause is usually **generics**: each column can carry a different cell value type (`string`, `number | null`, etc.), while the table type expects one unified column definition type. This doc lists **approved patterns** used in this repo so we stay type-safe **without** resorting to `as any`.

**Non-developers:** You can skip this file; it is only for people editing table column definitions.

---

## The usual error (symptom)

TypeScript may report that `AccessorKeyColumnDef<Company, string>` is not assignable to `ColumnDef<Company>` (or similar). That means the **inferred column types** do not match the **array** type you declared.

---

## Pattern A — `satisfies` (preferred)

Define the array with `satisfies ColumnDef<YourRowType>[]`. TypeScript checks the whole array without widening every column to `unknown`.

```typescript
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
// `Company` comes from `@/types/database.types` (aliases rows from generated `src/types/supabase.ts`).
import type { Company } from "@/types/database.types";
import { safeDisplay } from "@/lib/utils/data-format";

const columnHelper = createColumnHelper<Company>();

const columns = [
  columnHelper.accessor("firmenname", {
    header: "Firmenname",
    cell: (info) => safeDisplay(info.getValue()),
  }),
  columnHelper.accessor("value", {
    header: "Value",
    cell: (info) => formatCurrency(info.getValue()),
  }),
  columnHelper.display({
    id: "actions",
    header: "Actions",
    cell: () => null,
  }),
] satisfies ColumnDef<Company>[];
```

---

## Pattern B — cast each column

If `satisfies` fights your table wrapper, cast **each** column to `ColumnDef<YourRowType>`:

```typescript
const columns: ColumnDef<Company>[] = [
  columnHelper.accessor("firmenname", { /* ... */ }) as ColumnDef<Company>,
  columnHelper.accessor("value", { /* ... */ }) as ColumnDef<Company>,
];
```

Verbose, but explicit and reliable.

---

## Pattern C — `ColumnDef<T, unknown>[]` (last resort)

```typescript
const columns: ColumnDef<Company, unknown>[] = [ /* ... */ ];
```

`info.getValue()` becomes `unknown` inside cells, so you need extra narrowing. Use only when time-constrained.

---

## Checklist before committing table code

- [ ] Columns use **Pattern A** or **Pattern B** (not scattered `as string` / `as any`).  
- [ ] Nullable DB fields use **`safeDisplay`**, `??`, or dedicated formatters (`formatCurrency`, dates, etc.).  
- [ ] `pnpm typecheck` and `pnpm build` pass.

---

## References

- [TanStack Table — TypeScript guide](https://tanstack.com/table/latest/docs/guide/typescript)  
- Related discussions: [TanStack/table#4302](https://github.com/TanStack/table/issues/4302), [TanStack/table#4382](https://github.com/TanStack/table/issues/4382)

---

AquaDock CRM v5 · 2026
