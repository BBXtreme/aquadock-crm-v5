import { AdminSectionHeader } from "@/components/features/admin/AdminSectionHeader";
import AdminTrashBinCard from "@/components/features/profile/AdminTrashBinCard";

export default function AdminTrashPage() {
  return (
    <div className="space-y-8">
      <AdminSectionHeader section="trash" />
      <AdminTrashBinCard />
    </div>
  );
}
