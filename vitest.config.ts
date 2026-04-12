import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],

  resolve: {
    tsconfigPaths: true,   // Native Vite support – removes the plugin warning
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
    ],
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
        "src/types/database.types_bak copy.ts",
        "src/**/login/page.tsx",
        "src/components/tables/TimelineTable.tsx",
        "src/components/features/timeline/TimelineEntryForm.tsx",
        "src/components/features/reminder/ReminderEditForm.tsx",
        "src/components/features/companies/CompaniesTable.tsx",
        "src/components/ui/dialog.tsx",
        "src/components/ui/dropdown-menu.tsx",
        "src/components/ui/data-table.tsx",
        "src/components/ui/select.tsx",
        "src/components/ui/form.tsx",
        "src/components/ui/skeleton.tsx",
        "src/components/ui/badge.tsx",
        "src/components/features/companies/CompanyCreateForm.tsx",
        // Large / branch-heavy client UI and helpers — covered indirectly or by manual/E2E flows; kept out of the global coverage gate.
        "src/app/**/companies/*/CompanyDetailClient.tsx",
        "src/components/company-detail/AquaDockCard.tsx",
        "src/components/company-detail/CompanyDetailsCard.tsx",
        "src/components/company-detail/CompanyHeader.tsx",
        "src/components/company-detail/CompanyKpiCards.tsx",
        "src/components/company-detail/CRMForm.tsx",
        "src/components/features/companies/AquaDockEditForm.tsx",
        "src/components/features/companies/CompanyEditForm.tsx",
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
    testTimeout: 10000,
    pool: "threads",
  },
});