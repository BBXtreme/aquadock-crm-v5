"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface SkeletonListProps {
  count?: number
  className?: string
  itemClassName?: string
}

export function SkeletonList({
  count = 5,
  className,
  itemClassName = "h-12 w-full",
}: SkeletonListProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={itemClassName} />
      ))}
    </div>
  )
}
