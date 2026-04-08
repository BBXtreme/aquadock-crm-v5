// Fixed: corrected radix-ui imports for Vercel build
"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

function Tabs({ className, orientation = "horizontal", ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2",
        orientation === "horizontal" ? "flex-col" : "flex-row",
        className,
      )}
      orientation={orientation}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex items-center justify-center rounded-lg text-muted-foreground data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "h-9 bg-muted p-1",
        line: "h-auto gap-1 bg-transparent p-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-3 py-1 font-medium text-sm transition-all",
        "text-muted-foreground hover:text-foreground",
        "focus-visible:border-ring focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "disabled:pointer-events-none disabled:opacity-50",
        "group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start",
        // Default (segmented) variant — active pill on muted track
        "group-data-[variant=default]/tabs-list:data-[state=active]:bg-background group-data-[variant=default]/tabs-list:data-[state=active]:text-foreground group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm",
        "dark:group-data-[variant=default]/tabs-list:data-[state=active]:border-input dark:group-data-[variant=default]/tabs-list:data-[state=active]:bg-input/30",
        // Line variant — minimal chrome + underline indicator
        "group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:border-transparent group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:px-3 group-data-[variant=line]/tabs-list:py-2",
        "group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none dark:group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity",
        "group-data-[orientation=horizontal]/tabs:group-data-[variant=line]/tabs-list:after:inset-x-0 group-data-[orientation=horizontal]/tabs:group-data-[variant=line]/tabs-list:after:bottom-0 group-data-[orientation=horizontal]/tabs:group-data-[variant=line]/tabs-list:after:h-0.5",
        "group-data-[orientation=vertical]/tabs:group-data-[variant=line]/tabs-list:after:inset-y-0 group-data-[orientation=vertical]/tabs:group-data-[variant=line]/tabs-list:after:-right-1 group-data-[orientation=vertical]/tabs:group-data-[variant=line]/tabs-list:after:w-0.5",
        "group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none focus-visible:outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger, tabsListVariants };
