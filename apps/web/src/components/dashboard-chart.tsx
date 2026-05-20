"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useState } from "react";

const SERIES = [
  { key: "tpp", label: "TPP", color: "#3B82F6" },
  { key: "spal", label: "SPAL", color: "#06B6D4" },
  { key: "sab", label: "SAB", color: "#10B981" },
  { key: "rumah", label: "Rumah", color: "#F59E0B" },
  { key: "jamban", label: "Jamban", color: "#8B5CF6" },
  { key: "ttu", label: "TTU", color: "#EF4444" },
];

export function DashboardChart() {
  const [chartType, setChartType] = useState<"area" | "bar">("area");
  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["dashboard-trend"],
    queryFn: () => fetch("/api/dashboard/trend").then((r) => r.json()),
  });

  if (isLoading) {
    return <div className="h-[300px] bg-[hsl(var(--muted))] rounded-lg animate-pulse" />;
  }

  if (!data.length) {
    return <div className="h-[300px] flex items-center justify-center text-sm text-[hsl(var(--muted-foreground))]">Belum ada data</div>;
  }

  return (
    <div>
      {/* Chart type toggle */}
      <div className="flex items-center gap-1 mb-4">
        <button
          onClick={() => setChartType("area")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${chartType === "area" ? "bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]" : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"}`}
        >
          Area
        </button>
        <button
          onClick={() => setChartType("bar")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${chartType === "bar" ? "bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]" : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"}`}
        >
          Bar
        </button>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        {chartType === "area" ? (
          <AreaChart data={data}>
            <defs>
              {SERIES.map((s) => (
                <linearGradient key={s.key} id={`gradient-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 6% 90%)" vertical={false} />
            <XAxis dataKey="bulan" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: "8px", border: "1px solid hsl(240 6% 90%)", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
              labelStyle={{ fontWeight: 600, marginBottom: 4 }}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
            {SERIES.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                fill={`url(#gradient-${s.key})`}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
            ))}
          </AreaChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 6% 90%)" vertical={false} />
            <XAxis dataKey="bulan" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: "8px", border: "1px solid hsl(240 6% 90%)", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
              labelStyle={{ fontWeight: 600, marginBottom: 4 }}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
            {SERIES.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
