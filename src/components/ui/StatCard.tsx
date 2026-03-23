import type React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  change?: string;
  className?: string;
}

export default function StatCard({ title, value, icon, change, className }: StatCardProps) {
  return (
    <Card className={cn("bg-card shadow-sm border border-border/50 hover:shadow-md transition-all duration-200", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="rounded-full bg-muted/30 p-3 text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight text-foreground">{value}</div>
        {change && <p className="text-xs text-green-600/80 mt-1">{change}</p>}
      </CardContent>
    </Card>
  );
}
