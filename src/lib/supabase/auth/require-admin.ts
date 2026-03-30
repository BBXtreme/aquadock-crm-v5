import { requireUser } from "./require-user";

export async function requireAdmin() {
  const user = await requireUser();

  // TODO: Check user role from profile
  // For now, just return the user

  return user;
}
