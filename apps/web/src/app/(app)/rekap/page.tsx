"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, Calendar, ChevronDown, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
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
  good: { bg: "#00A876", soft: "rgba(0,168,118,0.12)", text: "#00A876" },
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
  const color = tier === "empty" ? "#7CF5CE" : TIER[tier].bg;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={7} />
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
        <span className="text-[22px] font-black tabular-nums leading-none text-white">
          {pct.toFixed(0)}
          <span className="text-[11px] font-bold text-white/50">%</span>
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
    <div className="w-full mx-auto pb-4 fade-in">
      {/* ── HERO: score ring + filters ── */}
      <div className="relative overflow-hidden bg-[#0C1B16] text-white">
        <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full bg-[#00A876] opacity-[0.12]" />
        <div className="absolute -bottom-40 -left-20 w-80 h-80 rounded-full bg-[#BEF264] opacity-[0.05]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,#123527_0%,transparent_55%)]" />

        <div className="relative z-10 px-8 py-7">
          <div className="flex flex-wrap items-center gap-8">
            <ScoreRing pct={overallPct} />

            <div className="flex-1 min-w-[220px]">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#7CF5CE]/60 mb-2">
                Rekapitulasi Tahunan
              </p>
              <h1 className="text-[28px] font-black tracking-[-0.03em] leading-tight">
                {data?.selectedPkm ? data.selectedPkm.nama : "Semua Puskesmas"}
              </h1>
              <p className="text-[12px] font-medium text-white/50 mt-1.5">
                {overallLabel} · rata-rata {overallPct.toFixed(1)}% dari {cats.length} kategori
              </p>

              {/* Tier chips */}
              <div className="flex items-center gap-2 mt-4">
                <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-[#00A876]/15 border border-[#00A876]/25 text-[#7CF5CE] text-[11px] font-extrabold tabular-nums">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00A876]" /> {goodCount} Baik
                </span>
                <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-[#E8A33D]/15 border border-[#E8A33D]/25 text-[#F5C97C] text-[11px] font-extrabold tabular-nums">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E8A33D]" /> {warnCount} Cukup
                </span>
                <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-[#E15A4F]/15 border border-[#E15A4F]/25 text-[#F5A099] text-[11px] font-extrabold tabular-nums">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E15A4F]" /> {badCount} Kurang
                </span>
              </div>
            </div>

            {/* Filters — inside hero, right side */}
            <div className="flex flex-col items-end gap-2.5">
              <div className="flex items-center rounded-full bg-white/[0.08] border border-white/15 overflow-hidden">
                <button
                  onClick={() => setTahun((t) => t - 1)}
                  className="w-9 h-10 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  value={tahun}
                  onChange={(e) => setTahun(Number(e.target.value))}
                  className="w-[64px] h-10 px-1 bg-transparent text-[15px] font-black text-white text-center outline-none tabular-nums"
                />
                <button
                  onClick={() => setTahun((t) => t + 1)}
                  className="w-9 h-10 flex items-center justify-center text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {user?.role === "ADMIN" && data?.puskesmasList && (
                <div className="relative">
                  <Building2 className="w-3.5 h-3.5 text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                  <select
                    value={puskesmasId}
                    onChange={(e) => setPuskesmasId(e.target.value)}
                    className="h-10 pl-9 pr-8 rounded-full bg-white/[0.08] border border-white/15 text-[12px] font-bold text-white outline-none focus:border-[#00A876] transition-colors appearance-none cursor-pointer [&>option]:text-black"
                  >
                    <option value="">Semua Puskesmas</option>
                    {data.puskesmasList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-white/50 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}

              <a
                href={`/api/export/dynamic?tahun=${tahun}${puskesmasId ? `&puskesmasId=${puskesmasId}` : ""}`}
                className="h-10 px-5 flex items-center gap-2 rounded-full bg-[#BEF264] text-[#06281E] text-[11px] font-extrabold hover:brightness-95 transition"
              >
                <Download className="w-3.5 h-3.5" /> Export Excel
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="pt-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-[hsl(var(--border))] border-t-[#00A876] animate-spin rounded-full" />
          </div>
        ) : cats.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Belum ada data"
            description={`Tidak ada laporan tersubmit untuk tahun ${tahun}. Coba pilih tahun lain.`}
          />
        ) : (
          <div className="space-y-6">
            {/* ── HEATMAP MATRIX ── */}
            <div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[860px]">
                  <thead>
                    <tr className="border-b border-[hsl(var(--border))]">
                      <th className="sticky left-0 z-10 bg-[hsl(var(--card))] px-5 py-4 text-left text-[10px] font-extrabold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.15em] min-w-[200px]">
                        Kategori
                      </th>
                      {BULAN.map((b) => (
                        <th
                          key={b}
                          className="px-1 py-4 text-center text-[10px] font-extrabold text-[hsl(var(--muted-foreground))] uppercase tracking-wider w-[62px]"
                        >
                          {b}
                        </th>
                      ))}
                      <th className="px-4 py-4 text-right text-[10px] font-extrabold text-[#00A876] uppercase tracking-[0.15em] w-[90px]">
                        Tahun
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {cats.map((cat) => {
                      const yearPct = cat.pctTotalYear || 0;
                      const yTier = pctTier(yearPct);
                      return (
                        <tr
                          key={cat.id}
                          className="border-b border-[hsl(var(--border))]/50 last:border-0 hover:bg-[hsl(var(--muted))]/30 transition-colors"
                        >
                          <td className="sticky left-0 z-10 bg-[hsl(var(--card))] px-5 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <span className="text-base shrink-0">{cat.icon}</span>
                              <span className="text-[12px] font-bold text-[hsl(var(--foreground))] leading-tight">
                                {cat.nama}
                              </span>
                            </div>
                          </td>
                          {Array.from({ length: 12 }, (_, i) => {
                            const m = cat.pctMonthly?.[i] || 0;
                            const t = pctTier(m || null);
                            return (
                              <td key={i} className="px-1 py-2.5">
                                <div
                                  className="h-9 rounded-lg flex items-center justify-center text-[10px] font-extrabold tabular-nums transition-transform hover:scale-105"
                                  style={{
                                    background: m > 0 ? TIER[t].soft : "transparent",
                                    color: m > 0 ? TIER[t].text : "hsl(var(--muted-foreground))",
                                    opacity: m > 0 ? 1 : 0.3,
                                  }}
                                  title={`${BULAN[i]}: ${m > 0 ? m.toFixed(1) : 0}%`}
                                >
                                  {m > 0 ? m.toFixed(0) : "·"}
                                </div>
                              </td>
                            );
                          })}
                          <td className="px-4 py-2.5 text-right">
                            <span
                              className="inline-flex items-center h-7 px-2.5 rounded-full text-[11px] font-extrabold tabular-nums"
                              style={{
                                background: yearPct > 0 ? TIER[yTier].soft : "hsl(var(--muted))",
                                color: yearPct > 0 ? TIER[yTier].text : "hsl(var(--muted-foreground))",
                              }}
                            >
                              {yearPct.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Legend footer */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-[hsl(var(--border))]/60 bg-[hsl(var(--muted))]/20">
                <div className="flex items-center gap-4 text-[10px] font-bold text-[hsl(var(--muted-foreground))]">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-md"
                      style={{ background: TIER.good.soft, border: `1px solid ${TIER.good.bg}40` }}
                    />
                    ≥ 80%
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-md"
                      style={{ background: TIER.warn.soft, border: `1px solid ${TIER.warn.bg}40` }}
                    />
                    60–79%
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-md"
                      style={{ background: TIER.low.soft, border: `1px solid ${TIER.low.bg}40` }}
                    />
                    &lt; 60%
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">
                  {cats.length} kategori × 12 bulan
                </span>
              </div>
            </div>

            {/* ── BEST / WORST SPOTLIGHT ── */}
            {cats.length >= 2 && best && worst && best.id !== worst.id && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-3xl border border-[#00A876]/25 bg-[#00A876]/[0.04] px-6 py-5 flex items-center gap-4">
                  <span className="text-3xl">{best.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#00A876] mb-1">
                      Tertinggi
                    </p>
                    <p className="text-[14px] font-bold text-[hsl(var(--foreground))] truncate">{best.nama}</p>
                  </div>
                  <span className="text-[26px] font-black tabular-nums text-[#00A876]">
                    {(best.pctTotalYear || 0).toFixed(0)}%
                  </span>
                </div>
                <div className="rounded-3xl border border-[#E15A4F]/25 bg-[#E15A4F]/[0.04] px-6 py-5 flex items-center gap-4">
                  <span className="text-3xl">{worst.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#E15A4F] mb-1">
                      Perlu Perhatian
                    </p>
                    <p className="text-[14px] font-bold text-[hsl(var(--foreground))] truncate">{worst.nama}</p>
                  </div>
                  <span className="text-[26px] font-black tabular-nums text-[#E15A4F]">
                    {(worst.pctTotalYear || 0).toFixed(0)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
