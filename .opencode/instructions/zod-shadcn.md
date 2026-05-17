# Zod + shadcn/ui Form Rules (OpenCode)

**Source:** `.cursor/rules/zod-shadcn.mdc` + `docs/AIDER-RULES.md`

## Single Source of Truth
- Zod schemas in `src/lib/validations/` are the only source of truth.
- Every schema: `.strict()`, `.trim()` on strings, `emptyStringToNull` transform for nullable columns.
- Use `z.string().uuid()` for all IDs.
- Enums from `src/lib/constants/company-options.ts`.
- After schema: always export `export type XForm = z.infer<typeof schema>;`

## React Hook Form + shadcn Pattern (Mandatory)
```ts
import { Control } from "react-hook-form";
import type { CompanyForm } from "@/lib/validations/company";

const form = useForm<CompanyForm>({ resolver: zodResolver(companyFormSchema) });

<FormField
  control={form.control as Control<CompanyForm>}
  name="..."
  render={({ field }) => <FormControl>...</FormControl>}
/>
```

Never use `control={form.control as any}`.

## Mapping Helpers
- Use `toCompanyInsert()`, `toCompanyUpdate()` etc. with safe transforms.
- Server Actions must re-validate with `.parse()` or `.safeParse()`.

Barrel import recommended:
```ts
import { companyFormSchema, type CompanyForm } from "@/lib/validations";
```

Follow these patterns on every form. See `docs/AIDER-RULES.md` section 3 for full validation rules.