"use client";

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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => {
        const isPositive = kpi.changePercent >= 0;
        const trendColor =
          kpi.trendColor || (isPositive ? "#24BACC" : "rgb(244 63 94)"); // marine for positive, rose for negative
        const arrowColor = isPositive ? "text-[#24BACC]" : "text-rose-500";

        return (
          <Card
            key={index}
            className="border border-border bg-card text-card-foreground shadow-sm rounded-xl"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{kpi.value}</div>
              <div className="flex items-center space-x-1 mt-1">
                {isPositive ? (
                  <TrendingUp className={`h-4 w-4 ${arrowColor}`} />
                ) : (
                  <TrendingDown className={`h-4 w-4 ${arrowColor}`} />
                )}
                <span className={`text-sm font-medium ${arrowColor}`}>
                  {Math.abs(kpi.changePercent)}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {kpi.subtitle}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
