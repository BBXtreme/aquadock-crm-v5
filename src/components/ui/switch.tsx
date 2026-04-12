"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as React from "react";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> & {
    /** Optional size variant for tighter or larger toggles (e.g. in compact settings tables) */
    size?: "sm" | "default" | "lg";
  }
>(({ className, size = "default", ...props }, ref) => {
  const sizeClasses = {
    sm: "h-5 w-9 peer-data-[state=checked]:translate-x-4",
    default: "h-6 w-11 peer-data-[state=checked]:translate-x-5",
    lg: "h-7 w-12 peer-data-[state=checked]:translate-x-6",
  }[size];

  const thumbSizeClasses = {
    sm: "h-4 w-4 data-[state=checked]:translate-x-4",
    default: "h-5 w-5 data-[state=checked]:translate-x-5",
    lg: "h-6 w-6 data-[state=checked]:translate-x-6",
  }[size];

  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",

        // OFF track — your perfected version (unchanged)
        "data-[state=unchecked]:bg-zinc-200 data-[state=unchecked]:border-zinc-900",
        "dark:data-[state=unchecked]:bg-zinc-500 dark:data-[state=unchecked]:border-zinc-600",

        // ON track — primary color from your theme/settings with higher specificity
        "data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500",

        sizeClasses,
        className,
      )}
      {...props}
      ref={ref}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block rounded-full shadow-md ring-0 transition-all duration-200",
          "bg-background",
          thumbSizeClasses,
        )}
      />
    </SwitchPrimitive.Root>
  );
});

Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };