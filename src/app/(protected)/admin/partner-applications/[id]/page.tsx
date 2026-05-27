import { notFound } from "next/navigation";
import { AdminSectionHeader } from "@/components/features/admin/AdminSectionHeader";
import { PartnerApplicationDetailCard } from "@/components/features/partner-applications/PartnerApplicationDetailCard";
import {
  createPartnerApplicationCvSignedUrl,
  getPartnerApplication,
} from "@/lib/actions/partner-applications-admin";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminPartnerApplicationDetailPage({ params }: Props) {
  const { id } = await params;
  const application = await getPartnerApplication(id);
  if (application == null) notFound();

  const cvDownloadUrl =
    application.cv_storage_path != null && application.cv_storage_path !== ""
      ? await createPartnerApplicationCvSignedUrl(application.cv_storage_path)
      : null;

  return (
    <div className="space-y-8">
      <AdminSectionHeader section="partnerApplications" />
      <PartnerApplicationDetailCard application={application} cvDownloadUrl={cvDownloadUrl} />
    </div>
  );
}
