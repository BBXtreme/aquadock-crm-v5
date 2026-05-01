import type { UserRole } from "@/lib/auth/types";

export type CompanyRecordForEditPermission = {
  user_id: string | null;
};

export type CompanyEditViewer = {
  id: string;
  role: UserRole;
} | null;

/**
 * Mirrors RLS `companies_update_owner_or_admin`: admins may edit any row; others only when
 * `companies.user_id` matches their auth id. Rows with no `user_id` are admin-only.
 */
export function canEditCompanyRecord(
  company: CompanyRecordForEditPermission,
  viewer: CompanyEditViewer,
): boolean {
  if (viewer == null) {
    return false;
  }
  if (viewer.role === "admin") {
    return true;
  }
  const ownerId = company.user_id;
  if (ownerId == null || ownerId === "") {
    return false;
  }
  return ownerId === viewer.id;
}
