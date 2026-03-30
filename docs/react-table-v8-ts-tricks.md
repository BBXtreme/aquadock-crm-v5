# TanStack React Table v8 – TypeScript Patterns & Gotchas  

**AquaDock CRM** – March 2026

## The Classic Type Error

```text
Type 'AccessorKeyColumnDef<Company, string>' is not assignable to type 'ColumnDef<Company>'
...
Type 'unknown' is not assignable to type 'string'.
(long chain involving accessorFn, HeaderContext, footer, etc.)
Root Cause
createColumnHelper<T>() generates narrowly typed column definitions:

accessor("firmenname") → produces ColumnDef<Company, string>
accessor("value")      → produces ColumnDef<Company, number | null>

However, the array type ColumnDef<Company>[] expects every element to be compatible with ColumnDef<Company, unknown>.
→ TypeScript detects a contravariant mismatch on the second generic parameter → massive, cascading error.
Recommended Patterns (2026 – Next.js 16 / TS strict)
Pattern A – Preferred (cleanest & modern)
Use satisfies (TypeScript 4.9+)
TypeScriptconst columnHelper = createColumnHelper<Company>();

const columns = [
  columnHelper.accessor("firmenname", {
    header: "Firmenname",
    cell: (info) => safeDisplay(info.getValue()),
  }),
  columnHelper.accessor("value", {
    header: "Value",
    cell: (info) => formatCurrency(info.getValue()),
  }),
  columnHelper.accessor("status", { … }),
  columnHelper.display({
    id: "actions",
    header: "Actions",
    cell: (info) => (/* … */),
  }),
] satisfies ColumnDef<Company>[];
→ Validates shape without forcing the value type to unknown.
Pattern B – Explicit casts (most reliable fallback)
TypeScriptconst columns: ColumnDef<Company>[] = [
  columnHelper.accessor("firmenname", { … }) as ColumnDef<Company>,
  columnHelper.accessor("kundentyp",   { … }) as ColumnDef<Company>,
  columnHelper.accessor("value",       { … }) as ColumnDef<Company>,
  columnHelper.accessor("status",      { … }) as ColumnDef<Company>,
  columnHelper.accessor("stadt",       { … }) as ColumnDef<Company>,
  columnHelper.accessor("land",        { … }) as ColumnDef<Company>,
  columnHelper.accessor("created_at",  { … }) as ColumnDef<Company>,
  columnHelper.display({ id: "actions", … }) as ColumnDef<Company>,
];
```

→ Every column must receive the cast — verbose but eliminates inference fights.
Pattern C – Quick & dirty (only when desperate)
TypeScriptconst columns: ColumnDef<Company, unknown>[] = [ … ];
→ Works, but info.getValue() returns unknown → forces extra casts inside cells.
Avoid unless you have very little time.
Quick Checklist – Before Committing Any Table Component

 Columns array uses satisfies ColumnDef<T>[]or explicit as ColumnDef<T> on each entry
 No remaining as string, as any, String(…), unsafe info.getValue() as …
 All nullable fields protected with ??, ?., or format helpers (formatCurrency, safeDisplay, formatDateDistance, …)
tsc --noEmit passes cleanly
next build completes without type errors

## Useful References

Official TanStack Table TypeScript Guide:
https://tanstack.com/table/v8/docs/guide/typescript
Related GitHub issues & discussions:
https://github.com/TanStack/table/issues/4302
https://github.com/TanStack/table/issues/4382
https://github.com/TanStack/table/discussions/4241

**Last updated: 2026-03-27**
Applies to: @tanstack/react-table ^8.10 – ^8.20 (verify in package.json)
AquaDock CRM rule: see also AIDER-RULES.md section 7
