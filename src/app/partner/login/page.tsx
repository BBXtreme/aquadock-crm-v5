// src/app/partner/login/page.tsx
//
// Public Aquadock Partner sign-in. Composes the dedicated partner layout +
// branded form. Backend is the SHARED Route Handler at /auth/login so session
// creation and post-login redirect logic stay in one place.

import { PartnerLoginForm } from "@/components/features/auth/PartnerLoginForm";
import { PartnerLoginLayout } from "@/components/features/auth/PartnerLoginLayout";

export const metadata = {
  title: "Aquadock Partner – Anmelden",
  description:
    "Partner-Login für Marinas, Hotels, Camping-Plätze und Vertriebspartner von Aquadock.",
};

export default function PartnerLoginPage() {
  return (
    <PartnerLoginLayout>
      <PartnerLoginForm />
    </PartnerLoginLayout>
  );
}
