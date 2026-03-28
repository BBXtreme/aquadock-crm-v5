import React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  change?: string;
  className?: string;
}

export function StatCard({ title, value, icon, change, className }: StatCardProps) {
  return (
    <Card
      className={cn(
        "bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-border/50 shadow-sm transition-all duration-200 hover:shadow-lg hover:shadow-primary/15 hover:bg-gradient-to-br hover:from-card hover:to-muted/50",
        className,
      )}
    >
      <div className="hover:brightness-105 transition-all">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className="rounded-full bg-muted/50 p-3 flex items-center justify-center">{icon}</div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold tracking-tight text-foreground">{value}</div>
          {change && <p className="text-xs text-green-600">{change}</p>}
        </CardContent>
      </div>
    </Card>
  );
}
