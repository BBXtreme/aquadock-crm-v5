import type React from "react";

import { requireRole } from "@/lib/auth/require-role";
import { PARTNER_ALLOWED_ROLES } from "@/lib/auth/role-page-access";

/**
 * Partner subpages within the SAME protected app shell (Sidebar/Header).
 * Access rule: partner OR admin.
 */
export default async function PartnerSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(PARTNER_ALLOWED_ROLES);
  return children;
}

