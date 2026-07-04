"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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

const COLOR_PALETTE = [
  "hsl(var(--accent))",
  "#10B981",
  "#3B82F6",
  "#F59E0B",
  "#8B5CF6",
  "#EF4444",
  "#06B6D4",
  "#F97316",
  "#EC4899",
  "#14B8A6",
];

interface CategoryItem {
  id: number;
  nama: string;
  code: string;
  icon: string;
}

export function DashboardChart() {
  const [chartType, setChartType] = useState<"area" | "bar">("area");

  const { data: categories = [] } = useQuery<CategoryItem[]>({
    queryKey: ["laporan-categories"],
    queryFn: async () => {
      const res = await fetch("/api/laporan/categories");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 5 * 60_000, // kategori jarang berubah, cache 5 menit
  });

  const { data: trendData = [], isLoading } = useQuery<any[]>({
    queryKey: ["dashboard-trend"],
    queryFn: () => fetch("/api/dashboard/trend").then((r) => r.json()),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const series = useMemo(
    () =>
      categories.map((cat, index) => ({
        key: cat.code,
        label: `${cat.icon} ${cat.nama}`,
        color: COLOR_PALETTE[index % COLOR_PALETTE.length],
      })),
    [categories],
  );

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 0,
    boxShadow: "none",
  };

  const labelStyle = {
    fontWeight: 700,
    color: "hsl(var(--foreground))",
    marginBottom: 6,
    fontSize: 11,
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
  };

  if (isLoading) {
    return (
      <div className="h-[300px] bg-[hsl(var(--muted))] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[hsl(var(--muted-foreground))]/30 border-t-[hsl(var(--accent))] animate-spin" />
      </div>
    );
  }

  if (!trendData.length || series.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-[12px] font-semibold text-[hsl(var(--muted-foreground))]">
        Belum ada data rekapitulasi laporan.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Chart type toggle */}
      <div className="flex items-center gap-1 justify-end">
        {(["area", "bar"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setChartType(type)}
            className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-colors ${
              chartType === type
                ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        {chartType === "area" ? (
          <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="bulan"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
            <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 16 }} />
            {series.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                fill={s.color}
                fillOpacity={0.06}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
          </AreaChart>
        ) : (
          <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="bulan"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={tooltipStyle} labelStyle={labelStyle} />
            <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 16 }} />
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={0} stackId="a" maxBarSize={32} />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
