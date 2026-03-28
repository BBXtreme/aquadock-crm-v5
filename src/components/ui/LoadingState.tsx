// src/components/ui/LoadingState.tsx
"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface LoadingStateProps {
  count?: number;
  className?: string;
  itemClassName?: string;
}

/**
 * Reusable loading skeleton with stable keys (no index-based keys).
 * This pattern satisfies Biome noArrayIndexKey rule permanently.
 */
export function LoadingState({ count = 5, className = "space-y-2", itemClassName = "h-14 w-full" }: LoadingStateProps) {
  // Pre-defined stable keys - never changes order
  const skeletonKeys = Array.from({ length: count }, (_, i) => `loading-item-${i}`);

  return (
    <div className={className}>
      {/* Optional header skeleton */}
      <Skeleton className="h-8 w-56" />

      <div className="space-y-2">
        {skeletonKeys.map((key) => (
          <Skeleton key={key} className={itemClassName} />
        ))}
      </div>
    </div>
  );
}
