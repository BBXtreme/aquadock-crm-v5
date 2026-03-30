// src/lib/supabase/auth/require-user.ts
// This function checks if there is a currently authenticated user. If there is no authenticated user, it redirects the user to the "/login" page. If there is an authenticated user, it returns the user's information. 
// The function uses the getCurrentUser function to retrieve the current user's information and then checks if the user exists. If not, it uses Next.js's redirect function to navigate to the login page.

import { redirect } from "next/navigation";
import { getCurrentUser } from "./get-current-user";

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
