import { Skeleton } from "@/components/ui/skeleton";

interface LoadingStateProps {
  type: "cards" | "table";
  count?: number;
  itemClassName?: string;
}

export function LoadingState({ type, count = 4, itemClassName }: LoadingStateProps) {
  if (type === "cards") {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (type === "table") {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <div className="space-y-2">
          {Array.from({ length: count }, (_, i) => (
            <Skeleton key={i} className={itemClassName || "h-14 w-full"} />
          ))}
        </div>
      </div>
    );
  }

  return null;
}
