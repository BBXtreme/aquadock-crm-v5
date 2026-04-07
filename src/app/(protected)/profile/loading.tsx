import { ProfilePageSkeleton } from "@/components/ui/page-list-skeleton";

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/30">
      <ProfilePageSkeleton />
    </div>
  );
}
