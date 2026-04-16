import type React from "react";
import { cn } from "@/lib/utils";

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

export function PageShell({ children, className }: PageShellProps) {
  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/30">
      <div
        className={cn(
          "container mx-auto space-y-8 p-4 sm:p-6 lg:p-8",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
