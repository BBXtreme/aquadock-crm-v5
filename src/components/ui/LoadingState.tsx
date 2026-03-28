// src/components/ui/LoadingState.tsx
"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface LoadingStateProps {
  count?: number;
  className?: string;
  itemClassName?: string;
}

/**
 * Reusable loading skeleton component.
 * Uses static keys to satisfy Biome noArrayIndexKey rule.
 */
export function LoadingState({ count = 5, className = "space-y-2", itemClassName = "h-14 w-full" }: LoadingStateProps) {
  return (
    <div className={className}>
      {/* Optional header skeleton */}
      <Skeleton className="h-8 w-56" />

      {/* Item skeletons with stable static keys */}
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, index) => (
          <Skeleton key={`loading-item-${index}`} className={itemClassName} />
        ))}
      </div>
    </div>
  );
}
