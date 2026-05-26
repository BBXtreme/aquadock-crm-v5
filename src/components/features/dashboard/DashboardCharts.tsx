"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type FunnelRow = {
  stageKey: string;
  value: number;
  stage: string;
  fill: string;
};

export type DashboardChartsProps = {
  funnelData: FunnelRow[];
};

export default function DashboardCharts({ funnelData }: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Sales Funnel */}
      <div className="bg-card rounded-(--radius) border border-border p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span className="h-5 w-5 text-primary" /> Funnel
          </h3>
          <span className="text-xs text-muted-foreground">Last period</span>
        </div>
        <div className="min-h-[300px] h-[320px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 640, height: 320 }}>
            <BarChart data={funnelData} layout="vertical" barCategoryGap={18}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="stage"
                width={110}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 13 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="value" radius={8}>
                {funnelData.map((entry) => (
                  <Cell key={entry.stageKey} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="bg-card rounded-(--radius) border border-border p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span className="h-5 w-5 text-primary" /> Distribution
          </h3>
        </div>
        <div className="min-h-[300px] h-[320px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 640, height: 320 }}>
            <PieChart>
              <Pie
                data={funnelData}
                cx="50%"
                cy="50%"
                innerRadius={75}
                outerRadius={115}
                dataKey="value"
                animationDuration={800}
              >
                {funnelData.map((entry) => (
                  <Cell key={entry.stageKey} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
