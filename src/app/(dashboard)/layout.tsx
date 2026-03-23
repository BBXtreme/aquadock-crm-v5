import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  console.log("=== DASHBOARD LAYOUT LOADED for path:", "unknown"); // request.nextUrl.pathname not available in layout
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  console.log("User from getUser():", user ? user.id : "NO USER");

  if (!user) {
    redirect("/login");
  }

  return <>{children}</>;
}
