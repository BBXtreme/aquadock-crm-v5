import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const SKELETON_LIST_KEYS = [
  "sl-0",
  "sl-1",
  "sl-2",
  "sl-3",
  "sl-4",
  "sl-5",
  "sl-6",
  "sl-7",
  "sl-8",
  "sl-9",
  "sl-10",
  "sl-11",
  "sl-12",
  "sl-13",
  "sl-14",
  "sl-15",
] as const;

const skeletonVariants = cva("rounded-md", {
  variants: {
    animation: {
      shimmer: "bg-muted/70 dark:bg-muted/50",
      none: "bg-muted/70 dark:bg-muted/50",
      pulse: "animate-pulse bg-muted/70 dark:bg-muted/50",
    },
    surface: {
      default: "",
      inset: "bg-muted/55 dark:bg-muted/35",
    },
  },
  defaultVariants: {
    animation: "shimmer",
    surface: "default",
  },
});

type SkeletonProps = ComponentProps<"div"> &
  VariantProps<typeof skeletonVariants> & {
    /** When true, omit shimmer/pulse (same as animation="none") for nested busy UIs. */
    static?: boolean;
  };

function Skeleton({ className, animation, surface, static: staticBlock, ...props }: SkeletonProps) {
  const resolvedAnimation = staticBlock ? "none" : (animation ?? "shimmer");
  const useShimmer = resolvedAnimation === "shimmer";

  return (
    <div
      data-slot="skeleton"
      data-skeleton-animate={useShimmer ? "shimmer" : undefined}
      className={cn(
        skeletonVariants({ animation: resolvedAnimation, surface }),
        useShimmer && "relative overflow-hidden",
        className,
      )}
      {...props}
    />
  );
}

/** Generic vertical list of skeleton bars (stable keys; max 16 items). */
function SkeletonList({
  count,
  className = "space-y-2",
  itemClassName = "h-14 w-full",
}: {
  count: number;
  className?: string;
  itemClassName?: string;
}) {
  const keys = SKELETON_LIST_KEYS.slice(0, Math.min(count, SKELETON_LIST_KEYS.length));
  return (
    <div className={className}>
      {keys.map((key) => (
        <Skeleton key={key} className={itemClassName} />
      ))}
    </div>
  );
}

export type { SkeletonProps };
export { Skeleton, SkeletonList, skeletonVariants };
