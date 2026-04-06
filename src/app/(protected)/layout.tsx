// src/app/(protected)/layout.tsx
import type React from "react";

import AppLayout from "@/components/layout/AppLayout";
import { requireUser } from "@/lib/auth/require-user";

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

  return <AppLayout user={user}>{children}</AppLayout>;
}