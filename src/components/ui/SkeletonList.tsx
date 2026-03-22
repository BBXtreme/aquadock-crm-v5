"use client"

import { Skeleton } from "@/components/ui/skeleton"

interface SkeletonListProps {
  count: number
  className?: string
  itemClassName?: string
}

export function SkeletonList({
  count,
  className = "space-y-2",
  itemClassName = "h-14 w-full",
}: SkeletonListProps) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map(() => (
        <Skeleton className={itemClassName} />
      ))}
    </div>
  )
}
