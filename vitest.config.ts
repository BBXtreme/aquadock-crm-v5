import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],

  resolve: {
    tsconfigPaths: true,   // Native Vite support – removes the plugin warning
    alias: {
      "server-only": resolve(__dirname, "src/test/server-only.ts"),
    },
  },

  test: {
    environment: "jsdom",
    globals: false,        // We use explicit imports – keeps tsc clean
    setupFiles: ["./src/test/setup.ts"],
    include: [
      "**/*.{test,spec}.{ts,tsx}",
      "**/__tests__/**/*.{ts,tsx}",
    ],
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "supabase/**",
      "**/coverage/**",
      "**/tests/e2e/**",
    ],
    // Coverage policy and when to add Vitest vs E2E: docs/testing-strategy.md
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "json-summary"],
      exclude: [
        "**/*.d.ts",
        "**/__tests__/**",
        "**/node_modules/**",
        "**/.next/**",
        "src/lib/constants/index.ts",
        "src/lib/i18n/types.ts",
        "src/types/supabase.ts",
        "src/types/database.types.ts",
        "src/types/brevo.ts",
        "src/**/login/page.tsx",
        "src/components/tables/TimelineTable.tsx",
        "src/components/features/timeline/TimelineEntryForm.tsx",
        "src/components/features/timeline/TimelineLinkCombobox.tsx",
        "src/components/features/reminder/ReminderEditForm.tsx",
        "src/components/ui/dialog.tsx",
        "src/components/ui/dropdown-menu.tsx",
        "src/components/ui/data-table.tsx",
        "src/components/ui/select.tsx",
        "src/components/ui/form.tsx",
        "src/components/ui/badge.tsx",
        "src/components/features/companies/CompanyCreateForm.tsx",
        // Large / branch-heavy client UI and helpers — covered indirectly or by manual/E2E flows; kept out of the global coverage gate.
        "src/components/features/companies/CompanyDetailClient.tsx",
        "src/components/features/companies/detail/AquaDockCard.tsx",
        "src/components/features/companies/detail/CompanyDetailsCard.tsx",
        "src/components/features/companies/detail/CompanyHeader.tsx",
        "src/components/features/companies/detail/CompanyKpiCards.tsx",
        "src/components/features/companies/detail/CRMForm.tsx",
        "src/components/features/companies/detail/LinkedContactsCard.tsx",
        "src/components/features/companies/detail/RemindersCard.tsx",
        "src/components/features/companies/detail/TimelineCard.tsx",
        "src/components/features/companies/AquaDockEditForm.tsx",
        "src/components/features/companies/CompanyEditForm.tsx",
        "src/components/features/contacts/ContactEditForm.tsx",
        "src/components/features/reminder/ReminderCreateForm.tsx",
        // TanStack column factory + cell renderers: hundreds of branches; list behavior covered via E2E and API tests.
        "src/components/tables/CompaniesTable.tsx",
        // Static CSV documentation grid (no business logic); not worth a dedicated unit harness for coverage.
        "src/components/features/companies/CSVFieldGuide.tsx",
        "src/lib/services/contacts.ts",
        // Large server-only trash flows and audit logging: covered by integration/E2E; hundreds of branches with no unit harness.
        "src/lib/actions/crm-trash.ts",
        "src/lib/server/delete-audit.ts",
        // Server actions / service-role client: branch-heavy Supabase + auth paths; covered via integration/E2E rather than mocked unit suites.
        "src/lib/actions/companies.ts",
        // Nodemailer + DNS + batch send: branch-heavy; `mass-email.test.ts` covers guard rails; E2E covers UI.
        "src/lib/actions/mass-email.ts",
        "src/lib/supabase/admin.ts",
      ],
      thresholds: {
        statements: 85,
        branches: 80,
        functions: 80,
        lines: 85,
      },
    },
    testTimeout: 10000,
    pool: "threads",
  },
});