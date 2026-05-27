import { AdminSectionHeader } from "@/components/features/admin/AdminSectionHeader";
import PartnerApplicationsInboxCard from "@/components/features/partner-applications/PartnerApplicationsInboxCard";

export default function AdminPartnerApplicationsPage() {
  return (
    <div className="space-y-8">
      <AdminSectionHeader section="partnerApplications" />
      <PartnerApplicationsInboxCard />
    </div>
  );
}
