// src/app/partner/login/layout.tsx
// Public partner login layout. Scoped to `/partner/login` only — distinct from
// the protected partner route group at `(protected)/partner/*`.

import type { ReactNode } from "react";

import { PartnerThemeProvider } from "@/components/features/auth/PartnerThemeProvider";
import { I18nProvider } from "@/lib/i18n/provider";

export default function PartnerLoginLayoutRoot({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <I18nProvider>
      <PartnerThemeProvider>{children}</PartnerThemeProvider>
    </I18nProvider>
  );
}
