import type { OwnerScopedEditViewer } from "@/lib/auth/owner-scoped-edit-permission";
import { hasRole } from "@/lib/auth/types";

export type ReminderRecordForEditPermission = {
  user_id: string | null;
  assigned_to: string | null;
};

/** Mirrors RLS `reminders_update_owner_assignee_or_admin` / `reminders_delete_owner_or_admin`. */
export function canEditReminderRecord(
  reminder: ReminderRecordForEditPermission,
  viewer: OwnerScopedEditViewer,
): boolean {
  if (viewer == null) {
    return false;
  }
  if (hasRole(viewer, "admin")) {
    return true;
  }
  if (reminder.user_id === viewer.id) {
    return true;
  }
  return reminder.assigned_to === viewer.id;
}
