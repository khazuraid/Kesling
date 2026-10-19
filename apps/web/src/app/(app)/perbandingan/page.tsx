"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, Crown } from "lucide-react";
import { LaporanFilter } from "@/components/laporan-filter";
import { PdfExportButton } from "@/components/pdf-export-button";
import { EmptyState } from "@/components/ui/empty-state";
import { useLaporanFilter } from "@/hooks/use-laporan-filter";
import { cn } from "@/lib/utils";

interface CategoryItem {
  id: number;
  nama: string;
  code: string;
  icon: string;
}

function tierOf(pct: number) {
  if (pct >= 80) return { bar: "#059669", soft: "rgba(5,150,105,0.12)", text: "#059669" };
  if (pct >= 60) return { bar: "#E8A33D", soft: "rgba(232,163,61,0.14)", text: "#C07F1F" };
  return { bar: "#E15A4F", soft: "rgba(225,90,79,0.12)", text: "#E15A4F" };
}

const MEDAL = [
  { ring: "#F5B93D", glow: "rgba(245,185,61,0.35)", label: "Juara 1" },
  { ring: "#B8C0CC", glow: "rgba(184,192,204,0.35)", label: "Juara 2" },
  { ring: "#D98E5F", glow: "rgba(217,142,95,0.35)", label: "Juara 3" },
];

export default function PerbandinganPage() {
  const { bulan, tahun } = useLaporanFilter();

  const { data: categories = [] } = useQuery<CategoryItem[]>({
    queryKey: ["laporan-categories"],
    queryFn: async () => {
      const res = await fetch("/api/laporan/categories");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: ranking = [], isLoading } = useQuery<any[]>({
    queryKey: ["ranking", bulan, tahun],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/ranking?bulan=${bulan}&tahun=${tahun}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 5000,
  });

  const pdfHeaders = ["#", "Puskesmas", ...categories.map((c) => `${c.nama} %`), "Rata-rata %"];
  const pdfRows = ranking.map((r, i) => [i + 1, r.nama, ...categories.map((c) => r[c.code] || 0), r.avg]);

  const avgScore = ranking.length > 0 ? Math.round(ranking.reduce((sum, r) => sum + r.avg, 0) / ranking.length) : 0;
  const top3 = ranking.slice(0, 3);
  // Podium order: 2nd, 1st, 3rd
  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;
  const podiumRank = (r: any) => ranking.indexOf(r);

  return (
    <div className="w-full mx-auto pb-6 space-y-6 fade-in bg-canvas">
      {/* ── HERO + PODIUM ── */}
      <div className="relative overflow-hidden rounded-card bg-[#0C1B16] text-white border border-[#16352B] shadow-float">
        <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full bg-primary opacity-[0.14] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-48 left-1/3 w-96 h-96 rounded-full bg-[#BEF264] opacity-[0.06] blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,#123527_0%,transparent_55%)] pointer-events-none" />

        <div className="relative z-10 px-6 sm:px-8 pt-6 sm:pt-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#7CF5CE]/60 mb-2">
                Kinerja Wilayah
              </p>
              <h1 className="text-[26px] sm:text-[30px] font-black tracking-tight leading-none">Perbandingan</h1>
              <p className="text-[13px] font-medium text-white/50 mt-2">
                {ranking.length} puskesmas · rata-rata {avgScore}%
              </p>
            </div>
            <div className="flex items-center gap-2">
              <LaporanFilter />
              {ranking.length > 0 && (
                <PdfExportButton
                  title={`Ranking Puskesmas - ${bulan}/${tahun}`}
                  headers={pdfHeaders}
                  rows={pdfRows}
                  filename="ranking-puskesmas"
                />
              )}
            </div>
          </div>

          {/* PODIUM */}
          {!isLoading && top3.length > 0 && (
            <div className="mt-8 flex items-end justify-center gap-3 sm:gap-5">
              {podiumOrder.map((r) => {
                const rank = podiumRank(r);
                const medal = MEDAL[rank];
                const isFirst = rank === 0;
                const height = isFirst ? "h-28" : rank === 1 ? "h-20" : "h-16";
                return (
                  <div key={r.id} className="flex flex-col items-center w-36 sm:w-44">
                    {/* Medal + name */}
                    <div className="relative mb-3">
                      <div
                        className={cn(
                          "rounded-full flex items-center justify-center font-black text-[#0C1B16]",
                          isFirst ? "w-16 h-16 text-[20px]" : "w-13 h-13 text-[16px]",
                        )}
                        style={{
                          width: isFirst ? 64 : 52,
                          height: isFirst ? 64 : 52,
                          background: medal.ring,
                          boxShadow: `0 0 0 5px ${medal.glow}`,
                        }}
                      >
                        {rank + 1}
                      </div>
                      {isFirst && (
                        <Crown className="absolute -top-5 left-1/2 -translate-x-1/2 w-5 h-5 text-[#F5B93D]" />
                      )}
                    </div>
                    <p className="text-[12px] sm:text-[13px] font-bold text-white text-center leading-tight line-clamp-2 h-8">
                      {r.nama}
                    </p>
                    <p className="text-[20px] sm:text-[24px] font-black tabular-nums text-[#7CF5CE] mt-1">
                      {r.avg}
                      <span className="text-[12px] font-bold text-white/40">%</span>
                    </p>
                    {/* Pillar */}
                    <div
                      className={cn("w-full mt-3 rounded-t-2xl border-x border-t border-white/10", height)}
                      style={{
                        background: `linear-gradient(180deg, ${medal.ring}30 0%, rgba(255,255,255,0.03) 100%)`,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {isLoading && (
            <div className="mt-8 flex items-end justify-center gap-5 animate-pulse">
              {[80, 112, 64].map((h, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-13 h-13 rounded-full bg-white/10 mb-3" style={{ width: 52, height: 52 }} />
                  <div className="h-3 w-24 bg-white/10 rounded mb-2" />
                  <div className="rounded-t-2xl bg-white/5 w-36 sm:w-44" style={{ height: h }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="pt-2">
        {/* EMPTY */}
        {!isLoading && ranking.length === 0 && (
          <EmptyState
            icon={Activity}
            title="Belum ada ranking"
            description="Belum ada laporan tersubmit untuk periode ini. Coba ubah filter bulan atau tahun."
          />
        )}

        {/* BENTO SUMMARY CARDS + RANKING BAR LIST */}
        {!isLoading && ranking.length > 0 && (
          <div className="space-y-6">
            {/* Bento-style summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-card bg-surface border border-border shadow-subtle p-5 flex items-center gap-4 hover:shadow-float transition-all">
                <div className="w-11 h-11 rounded-xl bg-primary-subtle text-primary flex items-center justify-center shrink-0">
                  <Activity className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-0.5">
                    Rata-Rata Kinerja
                  </p>
                  <p className="text-[24px] font-black tabular-nums text-foreground leading-none">
                    {avgScore}
                    <span className="text-[14px] font-bold text-muted-foreground">%</span>
                  </p>
                </div>
              </div>
              <div className="rounded-card bg-surface border border-border shadow-subtle p-5 flex items-center gap-4 hover:shadow-float transition-all">
                <div className="w-11 h-11 rounded-xl bg-[#F5B93D]/15 text-[#D98E1F] flex items-center justify-center shrink-0">
                  <Crown className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-0.5">
                    Peringkat 1
                  </p>
                  <p className="text-[14px] font-bold text-foreground truncate">{top3[0]?.nama || "—"}</p>
                  <p className="text-[11px] font-extrabold text-primary tabular-nums mt-0.5">
                    {top3[0]?.avg || 0}% Capaian
                  </p>
                </div>
              </div>
              <div className="rounded-card bg-surface border border-border shadow-subtle p-5 flex items-center gap-4 hover:shadow-float transition-all">
                <div className="w-11 h-11 rounded-xl bg-surface-subtle text-foreground flex items-center justify-center shrink-0 font-black text-sm">
                  {ranking.length}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-0.5">
                    Total Puskesmas
                  </p>
                  <p className="text-[14px] font-bold text-foreground">{ranking.length} Fasilitas Aktif</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{categories.length} Kategori Program</p>
                </div>
              </div>
            </div>

            {/* Ranking cards list */}
            <div className="space-y-2.5">
              {/* Column header */}
              <div className="flex items-center gap-4 px-5 text-[9px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">
                <span className="w-8 text-center">Rank</span>
                <span className="w-48 shrink-0">Puskesmas</span>
                <span className="flex-1">Skor per kategori</span>
                <span className="w-16 text-right">Rata-rata</span>
              </div>

              {ranking.map((r, i) => {
                const t = tierOf(r.avg);
                const isTop3 = i < 3;
                return (
                  <div
                    key={r.id}
                    className={cn(
                      "flex items-center gap-4 px-5 py-3.5 rounded-card border transition-all shadow-subtle",
                      isTop3
                        ? "border-border bg-surface hover:shadow-float"
                        : "border-border/70 bg-surface/80 hover:bg-surface hover:border-border hover:shadow-subtle",
                    )}
                  >
                    {/* Rank */}
                    <span className="w-8 text-center shrink-0">
                      {isTop3 ? (
                        <span
                          className="inline-flex w-7 h-7 rounded-full items-center justify-center text-[11px] font-black text-[#0C1B16]"
                          style={{ background: MEDAL[i].ring }}
                        >
                          {i + 1}
                        </span>
                      ) : (
                        <span className="text-[13px] font-bold text-muted-foreground tabular-nums">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                      )}
                    </span>

                    {/* Name */}
                    <span className="w-48 shrink-0 text-[13px] font-bold text-foreground truncate">{r.nama}</span>

                    {/* Category score segments */}
                    <div className="flex-1 min-w-0">
                      <div className="flex h-2.5 rounded-full overflow-hidden bg-surface-subtle">
                        {categories.map((c) => {
                          const val = r[c.code] || 0;
                          if (val <= 0) return null;
                          return (
                            <div
                              key={c.code}
                              className="h-full transition-all duration-500"
                              style={{
                                width: `${val / categories.length}%`,
                                background: tierOf(val).bar,
                                opacity: 0.85,
                              }}
                              title={`${c.nama}: ${val}%`}
                            />
                          );
                        })}
                      </div>
                      <div className="flex gap-3 mt-1.5 flex-wrap">
                        {categories.map((c) => {
                          const val = r[c.code] || 0;
                          return (
                            <span
                              key={c.code}
                              className="text-[9px] font-bold tabular-nums"
                              style={{ color: tierOf(val).text }}
                            >
                              {c.icon} {val}%
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Avg */}
                    <span
                      className="w-16 shrink-0 text-right text-[18px] font-black tabular-nums"
                      style={{ color: t.text }}
                    >
                      {r.avg}
                      <span className="text-[10px] font-bold">%</span>
                    </span>
                  </div>
                );
              })}

              {/* Legend */}
              <div className="flex items-center justify-end gap-4 pt-2 text-[10px] font-bold text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-primary" /> ≥80%
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#E8A33D]" /> 60–79%
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#E15A4F]" /> &lt;60%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
