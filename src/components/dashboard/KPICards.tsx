"use client";

import { TrendingDown, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface KPI {
  title: string;
  value: string | number;
  changePercent: number;
  subtitle: string;
}

interface KPICardsProps {
  kpis: KPI[];
}

export default function KPICards({ kpis }: KPICardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi, _index) => {
        const isPositive = kpi.changePercent >= 0;
        const arrowColor = isPositive ? "text-primary" : "text-destructive";

        return (
          <Card key={kpi.title} className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-medium text-sm">{kpi.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-bold text-3xl">{kpi.value}</div>
              <div className="mt-1 flex items-center space-x-1">
                {isPositive ? (
                  <TrendingUp className={`h-4 w-4 ${arrowColor}`} />
                ) : (
                  <TrendingDown className={`h-4 w-4 ${arrowColor}`} />
                )}
                <span className={`font-medium text-sm ${arrowColor}`}>{Math.abs(kpi.changePercent)}%</span>
              </div>
              <p className="mt-1 text-muted-foreground text-xs">{kpi.subtitle}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
