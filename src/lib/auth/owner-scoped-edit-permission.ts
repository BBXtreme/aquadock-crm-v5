import { hasRole, type UserRole } from "@/lib/auth/types";

export type OwnerScopedRecord = {
  user_id: string | null;
};

export type OwnerScopedEditViewer = {
  id: string;
  roles: UserRole[];
} | null;

/**
 * Mirrors RLS owner-or-admin write policies on `companies`, `contacts`, etc.:
 * admins may edit any row; others only when `user_id` matches their auth id.
 * Rows with no `user_id` are admin-only.
 */
export function canEditOwnerScopedRecord(
  record: OwnerScopedRecord,
  viewer: OwnerScopedEditViewer,
): boolean {
  if (viewer == null) {
    return false;
  }
  if (hasRole(viewer, "admin")) {
    return true;
  }
  const ownerId = record.user_id;
  if (ownerId == null || ownerId === "") {
    return false;
  }
  return ownerId === viewer.id;
}
