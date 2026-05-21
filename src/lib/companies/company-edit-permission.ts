import {
  canEditOwnerScopedRecord,
  type OwnerScopedEditViewer,
  type OwnerScopedRecord,
} from "@/lib/auth/owner-scoped-edit-permission";

export type CompanyRecordForEditPermission = OwnerScopedRecord;
export type CompanyEditViewer = OwnerScopedEditViewer;

/** Mirrors RLS `companies_update_owner_or_admin` / `companies_delete_owner_or_admin`. */
export function canEditCompanyRecord(
  company: CompanyRecordForEditPermission,
  viewer: CompanyEditViewer,
): boolean {
  return canEditOwnerScopedRecord(company, viewer);
}
