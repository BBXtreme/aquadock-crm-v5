import { OpenMapViewSkeleton } from "@/components/ui/page-list-skeleton";

export default function OpenMapLoading() {
  return (
    <div className="relative h-[calc(100vh-4rem)] w-full">
      <OpenMapViewSkeleton />
    </div>
  );
}
