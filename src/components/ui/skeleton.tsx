import type React from "react";

import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("rounded-md bg-muted/70 dark:bg-muted/50", className)}
      {...props}
    />
  );
}

export { Skeleton };
