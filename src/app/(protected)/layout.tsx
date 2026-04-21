// src/app/(protected)/layout.tsx
import type React from "react";

import AppLayout from "@/components/layout/AppLayout";
import { requireCrmAccess } from "@/lib/auth/require-crm-access";
import { I18nProvider } from "@/lib/i18n/provider";

/**
 * Protected route boundary: one auth gate per segment tree.
 * `requireCrmAccess` blocks onboarding applicants and soft-declined users (see `/access-pending`, `/access-denied`).
 */
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireCrmAccess();

  // I18nProvider must wrap AppLayout so shell (Header, Sidebar) sits under NextIntlClientProvider.
  // It remains under ReactQueryProvider from root ClientLayout (I18nProvider uses React Query).
  return (
    <I18nProvider>
      <AppLayout user={user}>{children}</AppLayout>
    </I18nProvider>
  );
}