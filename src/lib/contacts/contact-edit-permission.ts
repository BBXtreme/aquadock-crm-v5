import {
  canEditOwnerScopedRecord,
  type OwnerScopedEditViewer,
  type OwnerScopedRecord,
} from "@/lib/auth/owner-scoped-edit-permission";

export type ContactRecordForEditPermission = OwnerScopedRecord;
export type ContactEditViewer = OwnerScopedEditViewer;

/** Mirrors RLS `contacts_update_owner_or_admin` / `contacts_delete_owner_or_admin`. */
export function canEditContactRecord(
  contact: ContactRecordForEditPermission,
  viewer: ContactEditViewer,
): boolean {
  return canEditOwnerScopedRecord(contact, viewer);
}
