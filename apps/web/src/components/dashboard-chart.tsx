"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fetchJson } from "@/lib/fetch-json";

export function DashboardChart() {
  const { data: trendData = [], isLoading } = useQuery<any[]>({
    queryKey: ["dashboard-trend"],
    queryFn: () => fetchJson<any[]>("/api/dashboard/trend"),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  // Sum semua kategori jadi satu series total — modul ditampilkan terpisah di grid chips
  const totalData = useMemo(
    () =>
      trendData.map((row: any) => {
        const { bulan, ...rest } = row;
        const total = Object.values(rest).reduce<number>((acc, v) => acc + (typeof v === "number" ? v : 0), 0);
        return { bulan, total };
      }),
    [trendData],
  );

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 12,
    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
    fontSize: 12,
    fontWeight: 700,
  };

  const labelStyle = {
    fontWeight: 800,
    color: "hsl(var(--foreground))",
    marginBottom: 4,
    fontSize: 11,
    textTransform: "uppercase" as const,
    letterSpacing: "0.12em",
  };

  if (isLoading) {
    return (
      <div className="h-[280px] bg-[hsl(var(--muted))]/30 rounded-2xl flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[hsl(var(--muted-foreground))]/30 border-t-[#00A876] animate-spin rounded-full" />
      </div>
    );
  }

  if (!totalData.length) {
    return (
      <div className="h-[280px] flex items-center justify-center text-[12px] font-semibold text-[hsl(var(--muted-foreground))]">
        Belum ada data rekapitulasi laporan.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={totalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="totalFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00A876" stopOpacity={0.22} />
            <stop offset="100%" stopColor="#00A876" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="bulan" fontSize={11} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
        <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={labelStyle}
          formatter={(value: any) => [`${value} laporan`, "Total"]}
        />
        <Area
          type="monotone"
          dataKey="total"
          name="Total Laporan"
          stroke="#00A876"
          strokeWidth={2.5}
          fill="url(#totalFill)"
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
