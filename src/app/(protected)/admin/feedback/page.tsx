import { AdminSectionHeader } from "@/components/features/admin/AdminSectionHeader";
import FeedbackInboxCard from "@/components/features/feedback/FeedbackInboxCard";

export default function AdminFeedbackPage() {
  return (
    <div className="space-y-8">
      <AdminSectionHeader section="feedback" />
      <FeedbackInboxCard />
    </div>
  );
}
