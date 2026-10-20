"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, Calendar, ChevronDown, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { Card } from "tamagui";
import { EmptyState } from "@/components/ui/empty-state";

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

type CellColor = "good" | "warn" | "low" | "empty";

function pctTier(pct: number | null): CellColor {
  if (pct === null || pct === 0) return "empty";
  if (pct >= 80) return "good";
  if (pct >= 60) return "warn";
  return "low";
}

const TIER = {
  good: { bg: "#059669", soft: "rgba(5,150,105,0.12)", text: "#059669" },
  warn: { bg: "#E8A33D", soft: "rgba(232,163,61,0.14)", text: "#C07F1F" },
  low: { bg: "#E15A4F", soft: "rgba(225,90,79,0.12)", text: "#E15A4F" },
  empty: { bg: "transparent", soft: "transparent", text: "hsl(var(--muted-foreground))" },
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

function ScoreRing({ pct, size = 92 }: { pct: number; size?: number }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const filled = Math.min(pct, 100) / 100;
  const tier = pctTier(pct || null);
  const color = tier === "empty" ? "#059669" : TIER[tier].bg;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          className="text-border"
          strokeWidth={7}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - filled)}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[22px] font-black tabular-nums leading-none text-foreground">
          {pct.toFixed(0)}
          <span className="text-[11px] font-bold text-muted-foreground">%</span>
        </span>
      </div>
    </div>
  );
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

  const cats = data?.categories || [];
  const overallPct = data?.overallPct || 0;
  const goodCount = data?.goodCount || 0;
  const warnCount = data?.warnCount || 0;
  const badCount = data?.badCount || 0;
  const overallLabel = data?.overallLabel || "Perlu Perhatian";

  // Best & worst category
  const sorted = [...cats].sort((a, b) => (b.pctTotalYear || 0) - (a.pctTotalYear || 0));
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  return (
    <div className="w-full fade-in min-h-screen bg-canvas">
      {/* ── MASTHEAD FLUSH LANGSUNG KE NAVBAR ── */}
      <div className="w-full bg-surface border-b border-border px-6 sm:px-8 py-5 sm:py-6">
        <div className="w-full max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-6">
            <ScoreRing pct={overallPct} />

            <div className="min-w-[220px]">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-primary mb-1.5">
                Rekapitulasi Tahunan
              </p>
              <h1 className="text-[22px] sm:text-[28px] font-black tracking-tight leading-tight text-foreground">
                {data?.selectedPkm ? data.selectedPkm.nama : "Semua Puskesmas"}
              </h1>
              <p className="text-[12px] sm:text-[13px] font-medium text-muted-foreground mt-1.5">
                {overallLabel} · rata-rata {overallPct.toFixed(1)}% dari {cats.length} kategori
              </p>

              {/* Tier chips */}
              <div className="flex items-center gap-2 mt-3">
                <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-primary-subtle border border-primary/20 text-primary text-[10px] font-extrabold tabular-nums">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" /> {goodCount} Baik
                </span>
                <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[10px] font-extrabold tabular-nums">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {warnCount} Cukup
                </span>
                <span className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-600 text-[10px] font-extrabold tabular-nums">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> {badCount} Kurang
                </span>
              </div>
            </div>
          </div>

          {/* Filters — inside hero, right side */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center rounded-full bg-surface-subtle border border-border overflow-hidden">
              <button
                onClick={() => setTahun((t) => t - 1)}
                className="w-9 h-10 flex items-center justify-center text-muted-foreground hover:bg-surface hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="number"
                value={tahun}
                onChange={(e) => setTahun(Number(e.target.value))}
                className="w-[64px] h-10 px-1 bg-transparent text-[15px] font-black text-foreground text-center outline-none tabular-nums"
              />
              <button
                onClick={() => setTahun((t) => t + 1)}
                className="w-9 h-10 flex items-center justify-center text-muted-foreground hover:bg-surface hover:text-foreground transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {user?.role === "ADMIN" && data?.puskesmasList && (
              <div className="relative">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                <select
                  value={puskesmasId}
                  onChange={(e) => setPuskesmasId(e.target.value)}
                  className="h-10 pl-9 pr-8 rounded-full bg-surface-subtle border border-border text-[12px] font-bold text-foreground outline-none focus:border-primary transition-colors appearance-none cursor-pointer [&>option]:text-foreground [&>option]:bg-surface"
                >
                  <option value="">Semua Puskesmas</option>
                  {data.puskesmasList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            <a
              href={`/api/export/dynamic?tahun=${tahun}${puskesmasId ? `&puskesmasId=${puskesmasId}` : ""}`}
              className="h-10 px-5 flex items-center gap-2 rounded-full bg-primary text-white text-[11px] font-black hover:bg-primary-hover active:scale-95 transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5" /> Export Excel
            </a>
          </div>
        </div>
      </div>

      {/* ── CONTENT BODY (CANVAS) ── */}
      <div className="w-full max-w-[1600px] mx-auto px-6 sm:px-8 py-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-border border-t-primary animate-spin rounded-full" />
          </div>
        ) : cats.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Belum ada data"
            description={`Tidak ada laporan tersubmit untuk tahun ${tahun}. Coba pilih tahun lain.`}
          />
        ) : (
          <div className="space-y-6">
            {/* ── BEST / WORST SPOTLIGHT (Bento-style summary cards) ── */}
            {cats.length >= 2 && best && worst && best.id !== worst.id && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-card bg-surface border border-border shadow-subtle p-5 sm:p-6 flex items-center gap-4 hover:shadow-float transition-all">
                  <div className="w-12 h-12 rounded-xl bg-primary-subtle text-primary flex items-center justify-center text-2xl shrink-0">
                    {best.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary mb-1">
                      Kategori Tertinggi
                    </p>
                    <p className="text-[15px] font-bold text-foreground truncate">{best.nama}</p>
                  </div>
                  <span className="text-[26px] font-black tabular-nums text-primary">
                    {(best.pctTotalYear || 0).toFixed(0)}%
                  </span>
                </div>
                <div className="rounded-card bg-surface border border-border shadow-subtle p-5 sm:p-6 flex items-center gap-4 hover:shadow-float transition-all">
                  <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center text-2xl shrink-0">
                    {worst.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-red-600 mb-1">
                      Perlu Perhatian
                    </p>
                    <p className="text-[15px] font-bold text-foreground truncate">{worst.nama}</p>
                  </div>
                  <span className="text-[26px] font-black tabular-nums text-red-600">
                    {(worst.pctTotalYear || 0).toFixed(0)}%
                  </span>
                </div>
              </div>
            )}

            {/* ── HEATMAP MATRIX ── */}
            <div className="rounded-card bg-surface border border-border shadow-subtle overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-surface-subtle text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                      <th className="py-3.5 px-4 w-[280px]">Kategori</th>
                      {BULAN.map((b) => (
                        <th key={b} className="py-3.5 px-2 text-center text-[10px] font-bold">
                          {b}
                        </th>
                      ))}
                      <th className="py-3.5 px-4 text-center font-extrabold text-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {cats.map((cat) => {
                      const totalTier = pctTier(cat.pctTotalYear || null);
                      return (
                        <tr key={cat.id} className="hover:bg-surface-subtle/50 transition-colors">
                          <td className="py-3 px-4 font-bold text-[13px] text-foreground flex items-center gap-2.5">
                            <span className="text-lg shrink-0">{cat.icon}</span>
                            <span className="truncate">{cat.nama}</span>
                          </td>
                          {cat.pctMonthly.map((pct, idx) => {
                            const t = pctTier(pct);
                            return (
                              <td key={idx} className="py-2 px-1 text-center">
                                <div
                                  className="w-full py-2 rounded-lg text-[11px] font-bold tabular-nums transition-all"
                                  style={{
                                    backgroundColor: TIER[t].soft,
                                    color: TIER[t].text,
                                  }}
                                >
                                  {pct !== null && pct > 0 ? `${pct}%` : "—"}
                                </div>
                              </td>
                            );
                          })}
                          <td className="py-2 px-4 text-center">
                            <span
                              className="inline-block px-3 py-1.5 rounded-lg text-[12px] font-black tabular-nums"
                              style={{
                                backgroundColor: TIER[totalTier].soft,
                                color: TIER[totalTier].text,
                              }}
                            >
                              {cat.pctTotalYear !== null && cat.pctTotalYear > 0
                                ? `${cat.pctTotalYear.toFixed(1)}%`
                                : "—"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
