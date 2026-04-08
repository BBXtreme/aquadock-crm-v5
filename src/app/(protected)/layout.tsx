// src/app/(protected)/layout.tsx
import { appendFile } from "node:fs/promises";
import { join } from "node:path";
import type React from "react";

import AppLayout from "@/components/layout/AppLayout";
import { requireUser } from "@/lib/auth/require-user";
import { I18nProvider } from "@/lib/i18n/provider";

/**
 * Protected route boundary: one auth gate per segment tree.
 * `getCurrentUser` is already request-cached; `requireUser` is cached too so
 * nested pages that still call `requireUser` do not add extra Supabase work.
 */
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  // #region agent log
  void appendFile(
    join(process.cwd(), ".cursor/debug-2fbdf8.log"),
    `${JSON.stringify({
      sessionId: "2fbdf8",
      location: "protected/layout.tsx:after-requireUser",
      message: "Protected layout rendered",
      data: { role: user.role },
      timestamp: Date.now(),
      hypothesisId: "H4",
    })}\n`,
  ).catch(() => {
    /* debug ingest optional */
  });
  // #endregion

  // I18nProvider must wrap AppLayout so shell (Header, Sidebar) sits under NextIntlClientProvider.
  // It remains under ReactQueryProvider from root ClientLayout (I18nProvider uses React Query).
  return (
    <I18nProvider>
      <AppLayout user={user}>{children}</AppLayout>
    </I18nProvider>
  );
}