import { AdminSectionHeader } from "@/components/features/admin/AdminSectionHeader";
import UserManagementCard from "@/components/features/profile/UserManagementCard";
import { fetchAdminUserDirectory } from "@/lib/services/admin-user-directory";

export default async function AdminUsersPage() {
  const { allUsers, pendingUsers } = await fetchAdminUserDirectory();

  return (
    <div className="space-y-8">
      <AdminSectionHeader section="users" />
      <UserManagementCard allUsers={allUsers} pendingUsers={pendingUsers} />
    </div>
  );
}
