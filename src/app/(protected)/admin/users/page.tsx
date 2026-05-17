import { AdminSectionHeader } from "@/components/features/admin/AdminSectionHeader";
import UserManagementCard from "@/components/features/profile/UserManagementCard";
import { requireAdmin } from "@/lib/auth/require-admin";
import { fetchAdminUserDirectory } from "@/lib/services/admin-user-directory";

export default async function AdminUsersPage() {
  const currentUser = await requireAdmin();
  const { allUsers, pendingUsers } = await fetchAdminUserDirectory();

  return (
    <div className="space-y-8">
      <AdminSectionHeader section="users" />
      <UserManagementCard
        allUsers={allUsers}
        pendingUsers={pendingUsers}
        currentUserId={currentUser.id}
      />
    </div>
  );
}
