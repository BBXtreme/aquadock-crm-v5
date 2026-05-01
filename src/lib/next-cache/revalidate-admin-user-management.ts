import { revalidatePath } from "next/cache";

/** Invalidate admin user-management pages after directory / pending-users mutations. */
export function revalidateAdminUserManagement(): void {
  revalidatePath("/admin/users");
  revalidatePath("/admin", "layout");
}
