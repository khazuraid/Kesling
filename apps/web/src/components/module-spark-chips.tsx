"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo } from "react";
import { Line, LineChart, ResponsiveContainer } from "recharts";

interface CategoryStat {
  id: number;
  nama: string;
  code: string;
  icon: string | null;
  count: number;
  prevCount: number;
  pkmCount: number;
}

export function ModuleSparkChips({ stats }: { stats: CategoryStat[] }) {
  const { data: trendData = [] } = useQuery<any[]>({
    queryKey: ["dashboard-trend"],
    queryFn: () => fetch("/api/dashboard/trend").then((r) => r.json()),
    staleTime: 60_000,
  });

  const sparkMap = useMemo(() => {
    const map = new Map<string, { v: number }[]>();
    for (const s of stats) {
      map.set(
        s.code,
        trendData.map((row: any) => ({ v: typeof row[s.code] === "number" ? row[s.code] : 0 })),
      );
    }
    return map;
  }, [trendData, stats]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {stats.map((c) => {
        const pct = c.pkmCount > 0 ? Math.round((c.count / c.pkmCount) * 100) : 0;
        const diff = c.count - c.prevCount;
        const spark = sparkMap.get(c.code) || [];
        const strokeColor = pct >= 80 ? "hsl(var(--success))" : pct >= 50 ? "hsl(var(--warning))" : "hsl(var(--error))";
        return (
          <Link
            key={c.code}
            href={`/laporan/${c.code.toLowerCase()}`}
            className="group rounded-card border border-border bg-surface p-4 hover:border-primary/40 hover:bg-primary/[0.03] transition-all shadow-subtle"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base shrink-0">{c.icon || "▦"}</span>
                <p className="text-[12px] font-extrabold text-foreground truncate leading-tight">{c.nama}</p>
              </div>
              {diff !== 0 && (
                <span
                  className={`shrink-0 text-[11px] font-extrabold ${diff > 0 ? "text-emerald-600" : "text-rose-600"}`}
                >
                  {diff > 0 ? "+" : ""}
                  {diff}
                </span>
              )}
            </div>

            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[26px] font-black tabular-nums leading-none text-foreground">{c.count}</p>
                <p className="text-[11px] font-bold text-muted-foreground mt-1.5 uppercase tracking-[0.12em]">
                  <span className="tabular-nums">{pct}%</span> dari <span className="tabular-nums">{c.pkmCount}</span>{" "}
                  PKM
                </p>
              </div>
              <div className="w-[96px] h-[36px] shrink-0 -mb-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={spark} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
                    <Line
                      type="monotone"
                      dataKey="v"
                      stroke={strokeColor}
                      strokeWidth={1.8}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
