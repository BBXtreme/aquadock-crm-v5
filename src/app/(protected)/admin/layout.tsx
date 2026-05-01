import type React from "react";

import { AdminSubNav } from "@/components/layout/AdminSubNav";
import { PageShell } from "@/components/ui/page-shell";
import { requireAdmin } from "@/lib/auth/require-admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <PageShell>
      <AdminSubNav />
      {children}
    </PageShell>
  );
}
