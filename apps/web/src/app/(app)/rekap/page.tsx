"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Building2,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const BULAN_FULL = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

type CellColor = "good" | "warn" | "low" | "empty";

function pctTier(pct: number | null): CellColor {
  if (pct === null || pct === 0) return "empty";
  if (pct >= 80) return "good";
  if (pct >= 60) return "warn";
  return "low";
}

const CELL_BG: Record<CellColor, string> = {
  good: "hsl(var(--success))",
  warn: "hsl(var(--warning))",
  low: "hsl(var(--error))",
  empty: "hsl(var(--muted))",
};

const CELL_TEXT: Record<CellColor, string> = {
  good: "text-[hsl(var(--success))]",
  warn: "text-[hsl(var(--warning))]",
  low: "text-[hsl(var(--error))]",
  empty: "text-[hsl(var(--muted-foreground))]/40",
};

interface RekapData {
  tahun: number;
  puskesmasId?: number;
  selectedPkm?: { nama: string };
  puskesmasList: { id: number; nama: string }[];
  categories: {
    id: number;
    icon: string;
    nama: string;
    pctMonthly: number[];
    pctTotalYear: number;
  }[];
  overallPct: number;
  goodCount: number;
  warnCount: number;
  badCount: number;
  overallLabel: string;
}

export default function RekapPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const { data: session } = useSession();
  const user = session?.user as any;

  const tahunParam = sp.get("tahun");
  const pkmParam = sp.get("puskesmasId");

  const [tahun, setTahun] = useState(Number(tahunParam) || new Date().getFullYear());
  const [puskesmasId, setPuskesmasId] = useState(pkmParam || "");
  const _currentYear = new Date().getFullYear();

  // Sync URL when state changes
  const updateUrl = useCallback(
    (t: number, p: string) => {
      const params = new URLSearchParams();
      params.set("tahun", String(t));
      if (p) params.set("puskesmasId", p);
      router.replace(`/rekap?${params}`, { scroll: false });
    },
    [router],
  );

  useEffect(() => {
    updateUrl(tahun, puskesmasId);
  }, [tahun, puskesmasId, updateUrl]);

  const { data, isLoading } = useQuery<RekapData>({
    queryKey: ["rekap", tahun, puskesmasId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("tahun", String(tahun));
      if (puskesmasId) params.set("puskesmasId", puskesmasId);
      const res = await fetch(`/api/rekap?${params}`);
      if (!res.ok) throw new Error("Gagal");
      return res.json();
    },
  });

  const catsWithPct = data?.categories || [];
  const overallPct = data?.overallPct || 0;
  const goodCount = data?.goodCount || 0;
  const warnCount = data?.warnCount || 0;
  const badCount = data?.badCount || 0;
  const overallTier = pctTier(overallPct || null);
  const overallLabel = data?.overallLabel || "Perlu Perhatian";

  return (
    <div className="w-full mx-auto pb-4 space-y-4 fade-in">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <BarChart3 className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
        <div>
          <h1 className="text-[16px] font-bold text-[hsl(var(--foreground))]">
            {data?.selectedPkm ? `Puskesmas ${data.selectedPkm.nama}` : "Rekapitulasi Tahunan"}
          </h1>
          <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
            Tahun {tahun} • {catsWithPct.length} kategori
          </p>
        </div>
      </div>

      {/* FILTERS with year navigation */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Year navigation */}
        <div className="flex items-center border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <button
            onClick={() => setTahun((t) => t - 1)}
            className="w-8 h-9 flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors border-r border-[hsl(var(--border))]"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <input
            type="number"
            value={tahun}
            onChange={(e) => setTahun(Number(e.target.value))}
            className="w-[80px] h-9 px-3 bg-transparent text-[14px] font-bold text-[hsl(var(--foreground))] text-center outline-none tabular-nums"
          />
          <button
            onClick={() => setTahun((t) => t + 1)}
            className="w-8 h-9 flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors border-l border-[hsl(var(--border))]"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Puskesmas filter */}
        {user?.role === "ADMIN" && data?.puskesmasList && (
          <div className="relative">
            <Building2 className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
            <select
              value={puskesmasId}
              onChange={(e) => setPuskesmasId(e.target.value)}
              className="h-9 pl-8 pr-8 bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[12px] font-bold text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))] transition-colors appearance-none cursor-pointer"
            >
              <option value="">Semua Puskesmas</option>
              {data.puskesmasList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}

        <a
          href={`/api/export/dynamic?tahun=${tahun}${puskesmasId ? `&puskesmasId=${puskesmasId}` : ""}`}
          className="h-9 px-3 flex items-center gap-1.5 border border-[hsl(var(--border))] text-[11px] font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors ml-auto"
        >
          <Download className="w-3 h-3" /> Export Excel
        </a>
      </div>

      {/* Loading or data */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-[hsl(var(--border))] border-t-[hsl(var(--accent))] animate-spin" />
        </div>
      ) : (
        <>
          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-4 border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            {[
              {
                label: "Rata-rata",
                value: `${overallPct.toFixed(1)}%`,
                sub: overallLabel,
                color: overallTier === "good" ? "success" : overallTier === "warn" ? "warning" : "error",
              },
              {
                label: "Baik",
                value: String(goodCount),
                sub: "≥ 80%",
                color: "success",
              },
              {
                label: "Cukup",
                value: String(warnCount),
                sub: "60–79%",
                color: "warning",
              },
              {
                label: "Kurang",
                value: String(badCount),
                sub: "< 60%",
                color: "error",
              },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={`flex flex-col items-center justify-center py-4 px-2 ${i < 3 ? "border-r border-[hsl(var(--border))]" : ""}`}
              >
                <span className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">
                  {stat.label}
                </span>
                <span className={`text-[22px] font-bold tabular-nums leading-none text-[hsl(var(--${stat.color}))]`}>
                  {stat.value}
                </span>
                <span className="text-[9px] text-[hsl(var(--muted-foreground))] mt-0.5">{stat.sub}</span>
              </div>
            ))}
          </div>

          {/* CATEGORY CARDS */}
          {catsWithPct.length === 0 ? (
            <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col items-center justify-center py-20 gap-2">
              <Calendar className="w-8 h-8 text-[hsl(var(--muted-foreground))] opacity-30" />
              <p className="text-[13px] font-bold text-[hsl(var(--foreground))]">Belum ada data</p>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                Tidak ada laporan tersubmit untuk tahun {tahun}.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {catsWithPct.map((cat) => {
                const pct = cat.pctTotalYear || 0;
                const tier = pctTier(pct);
                const maxMonthly = Math.max(...(cat.pctMonthly || []), 1);
                const trend =
                  cat.pctMonthly && cat.pctMonthly.length >= 2
                    ? cat.pctMonthly[cat.pctMonthly.length - 1] - cat.pctMonthly[cat.pctMonthly.length - 2]
                    : 0;

                return (
                  <div key={cat.id} className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                    <div className="flex items-center gap-4 px-4 py-3">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <span className="text-lg shrink-0">{cat.icon}</span>
                        <div className="min-w-0">
                          <p className="text-[12px] font-bold text-[hsl(var(--foreground))] truncate">{cat.nama}</p>
                          <div className="flex items-center gap-1.5">
                            {trend > 1 ? (
                              <TrendingUp className="w-3 h-3 text-[hsl(var(--success))]" />
                            ) : trend < -1 ? (
                              <TrendingDown className="w-3 h-3 text-[hsl(var(--error))]" />
                            ) : (
                              <Minus className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
                            )}
                            <span className="text-[9px] font-medium text-[hsl(var(--muted-foreground))]">
                              {trend > 0 ? `+${trend.toFixed(0)}%` : trend < 0 ? `${trend.toFixed(0)}%` : "stabil"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="hidden sm:flex items-end gap-0.5 h-8 shrink-0">
                        {cat.pctMonthly?.map((m, i) => {
                          const h = maxMonthly > 0 ? Math.max(2, (m / maxMonthly) * 32) : 2;
                          const mTier = pctTier(m || null);
                          return (
                            <div
                              key={i}
                              className="group relative"
                              title={`${BULAN_FULL[i]}: ${m > 0 ? m.toFixed(1) : 0}%`}
                            >
                              <div
                                className="w-2.5"
                                style={{
                                  height: `${h}px`,
                                  background: CELL_BG[mTier],
                                  opacity: m > 0 ? 1 : 0.2,
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>

                      <div className="text-right shrink-0 w-20">
                        <span className={`text-[20px] font-bold tabular-nums ${CELL_TEXT[tier]}`}>
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="px-4 pb-3 hidden sm:block">
                      <div className="flex gap-0.5">
                        {cat.pctMonthly?.map((m, i) => {
                          const mTier = pctTier(m || null);
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                              <span className="text-[8px] font-bold text-[hsl(var(--muted-foreground))]">
                                {BULAN[i]}
                              </span>
                              <div className="w-full h-2" style={{ background: `hsl(var(--muted))` }}>
                                <div
                                  className="h-full transition-all"
                                  style={{
                                    width: `${Math.min(m, 100)}%`,
                                    background: CELL_BG[mTier],
                                    opacity: m > 0 ? 1 : 0.15,
                                  }}
                                />
                              </div>
                              <span
                                className={`text-[8px] font-bold tabular-nums ${m > 0 ? CELL_TEXT[mTier] : "text-[hsl(var(--muted-foreground))]/30"}`}
                              >
                                {m > 0 ? m.toFixed(0) : "—"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
