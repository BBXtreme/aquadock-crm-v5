// src/app/(protected)/layout.tsx
import type React from "react";

import AppLayout from "@/components/layout/AppLayout";
import { requireUser } from "@/lib/supabase/auth/require-user";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return <AppLayout user={user}>{children}</AppLayout>;
}
