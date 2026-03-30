// src/lib/supabase/auth/require-admin.ts
// This function checks if the currently authenticated user has an "admin" role. If the user is not authenticated, it redirects to the "/login" page. If the user is authenticated but does not have the "admin" role, it redirects to the "/unauthorized" page. If the user is an admin, it returns the user's information.
// The function uses the requireUser function to ensure that there is an authenticated user and then checks the user's role. Depending on the role, it either allows access or redirects accordingly.

import { redirect } from "next/navigation";
import { requireUser } from "./require-user";

export async function requireAdmin() {
  const user = await requireUser();

  if (user.role !== "admin") {
    redirect("/unauthorized");
  }

  return user;
}
