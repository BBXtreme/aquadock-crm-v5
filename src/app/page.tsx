// src/app/page.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { resolvePostLoginRedirect } from "@/lib/auth/post-login-redirect";

export default async function Home() {
  const user = await getCurrentUser();
  if (user === null) {
    redirect("/login");
  }
  redirect(resolvePostLoginRedirect({ roles: user.roles }));
}