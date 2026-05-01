import { CompanyDetailPageSkeleton } from "@/components/ui/page-list-skeleton";
import { PageShell } from "@/components/ui/page-shell";

/** Route-level suspense UI while the company segment loads (navigation + streaming). */
export default function CompanyDetailLoading() {
  return (
    <PageShell>
      <CompanyDetailPageSkeleton />
    </PageShell>
  );
}
