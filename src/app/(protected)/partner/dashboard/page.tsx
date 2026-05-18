import { PartnerDashboardWelcome } from "@/components/features/partner/PartnerDashboardWelcome";
import { PageShell } from "@/components/ui/page-shell";
import { requireRole } from "@/lib/auth/require-role";
import { PARTNER_ALLOWED_ROLES } from "@/lib/auth/role-page-access";

export const metadata = {
  title: "Aquadock Partner - Dashboard",
};

export default async function PartnerDashboardPage() {
  const user = await requireRole(PARTNER_ALLOWED_ROLES);
  return (
    <PageShell>
      <PartnerDashboardWelcome
        displayName={user.display_name ?? user.email ?? ""}
        userId={user.id}
      />
    </PageShell>
  );
}

