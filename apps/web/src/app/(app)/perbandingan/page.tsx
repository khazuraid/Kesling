"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, Building2, Trophy } from "lucide-react";
import { LaporanFilter } from "@/components/laporan-filter";
import { PdfExportButton } from "@/components/pdf-export-button";
import { useLaporanFilter } from "@/hooks/use-laporan-filter";
import { cn } from "@/lib/utils";

interface CategoryItem {
  id: number;
  nama: string;
  code: string;
  icon: string;
}

function tierColor(pct: number) {
  if (pct >= 80)
    return { bg: "hsl(var(--success))", text: "text-[hsl(var(--success))]", light: "hsl(var(--success-light))" };
  if (pct >= 60)
    return { bg: "hsl(var(--warning))", text: "text-[hsl(var(--warning))]", light: "hsl(var(--warning-light))" };
  return { bg: "hsl(var(--error))", text: "text-[hsl(var(--error))]", light: "hsl(var(--error-light))" };
}

function PodiumSkeleton() {
  return (
    <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-[hsl(var(--muted))]" />
        <div className="space-y-2">
          <div className="h-3 w-20 bg-[hsl(var(--muted))]" />
          <div className="h-3 w-28 bg-[hsl(var(--muted))]" />
        </div>
      </div>
      <div className="h-8 w-20 bg-[hsl(var(--muted))] mb-2" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-2.5 w-full bg-[hsl(var(--muted))]" />
        ))}
      </div>
    </div>
  );
}

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

  const medalColors = [
    { bg: "bg-amber-400", border: "border-amber-400/30", text: "text-amber-600" },
    { bg: "bg-slate-400", border: "border-slate-400/30", text: "text-slate-600" },
    { bg: "bg-orange-600", border: "border-orange-600/30", text: "text-orange-700" },
  ];

  const avgScore = ranking.length > 0 ? Math.round(ranking.reduce((sum, r) => sum + r.avg, 0) / ranking.length) : 0;
  const bestPerformer = ranking[0]?.nama || "-";

  return (
    <div className="w-full mx-auto pb-4 space-y-4 fade-in">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <Trophy className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
        <div>
          <h1 className="text-[16px] font-bold text-[hsl(var(--foreground))]">Perbandingan Puskesmas</h1>
          <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Peringkat kinerja antar wilayah</p>
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap items-center gap-2">
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

      {/* LOADING */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <PodiumSkeleton />
          <PodiumSkeleton />
          <PodiumSkeleton />
        </div>
      )}

      {/* EMPTY */}
      {!isLoading && ranking.length === 0 && (
        <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col items-center justify-center py-20 gap-2">
          <Activity className="w-8 h-8 text-[hsl(var(--muted-foreground))] opacity-30" />
          <p className="text-[13px] font-bold text-[hsl(var(--foreground))]">Tidak ada data</p>
          <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Coba ubah filter bulan atau tahun.</p>
        </div>
      )}

      {/* DATA */}
      {!isLoading && ranking.length > 0 && (
        <div className="space-y-4">
          {/* STATS SUMMARY */}
          <div className="grid grid-cols-3 border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            <div className="flex flex-col items-center justify-center py-4 px-2 border-r border-[hsl(var(--border))]">
              <span className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">
                Total Puskesmas
              </span>
              <span className="text-[22px] font-bold tabular-nums leading-none text-[hsl(var(--foreground))]">
                {ranking.length}
              </span>
              <span className="text-[9px] text-[hsl(var(--muted-foreground))] mt-0.5">Wilayah aktif</span>
            </div>
            <div className="flex flex-col items-center justify-center py-4 px-2 border-r border-[hsl(var(--border))]">
              <span className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">
                Rata-rata Skor
              </span>
              <div className="flex items-end gap-0.5">
                <span className="text-[22px] font-bold tabular-nums leading-none text-[hsl(var(--foreground))]">
                  {avgScore}
                </span>
                <span className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] mb-0.5">%</span>
              </div>
              <span className="text-[9px] text-[hsl(var(--muted-foreground))] mt-0.5">Kinerja keseluruhan</span>
            </div>
            <div className="flex flex-col items-center justify-center py-4 px-2">
              <span className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">
                Terbaik
              </span>
              <span className="text-[12px] font-bold text-[hsl(var(--foreground))] truncate max-w-[140px]">
                {bestPerformer}
              </span>
              <span className="text-[9px] text-[hsl(var(--muted-foreground))] mt-0.5">
                Skor: {ranking[0]?.avg || 0}%
              </span>
            </div>
          </div>

          {/* TOP 3 PODIUM */}
          {ranking.length >= 3 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {ranking.slice(0, 3).map((r, i) => {
                const tier = tierColor(r.avg);
                const medal = medalColors[i];
                return (
                  <div
                    key={r.id}
                    className={cn(
                      "border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4",
                      i === 0 && "md:-translate-y-2",
                      i === 2 && "md:translate-y-4",
                    )}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className={cn("w-10 h-10 flex items-center justify-center", medal.bg)}>
                        <span className="text-[16px] font-black text-white">#{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-[hsl(var(--foreground))] truncate">{r.nama}</p>
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
                          {i === 0 ? "Juara 1" : i === 1 ? "Juara 2" : "Juara 3"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-end gap-1 mb-3">
                      <span className={cn("text-[24px] font-black tabular-nums leading-none", tier.text)}>{r.avg}</span>
                      <span className="text-[13px] font-bold text-[hsl(var(--muted-foreground))] mb-0.5">%</span>
                    </div>

                    <div className="h-1.5 bg-[hsl(var(--muted))] overflow-hidden mb-4">
                      <div
                        className="h-full transition-all duration-700"
                        style={{ width: `${r.avg}%`, background: tier.bg }}
                      />
                    </div>

                    <div className="space-y-2">
                      {categories.map((c) => {
                        const val = r[c.code] || 0;
                        const catTier = tierColor(val);
                        return (
                          <div key={c.code} className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] w-16 shrink-0 truncate">
                              {c.icon} {c.code}
                            </span>
                            <div className="flex-1 h-1 bg-[hsl(var(--muted))] overflow-hidden">
                              <div
                                className="h-full transition-all"
                                style={{ width: `${val}%`, background: catTier.bg }}
                              />
                            </div>
                            <span className={cn("text-[10px] font-bold tabular-nums w-7 text-right", catTier.text)}>
                              {val}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* LESS THAN 3 */}
          {ranking.length > 0 && ranking.length < 3 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {ranking.map((r, i) => {
                const tier = tierColor(r.avg);
                const medal = medalColors[i] || medalColors[2];
                return (
                  <div key={r.id} className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={cn("w-10 h-10 flex items-center justify-center", medal.bg)}>
                        <span className="text-[16px] font-black text-white">#{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-[hsl(var(--foreground))] truncate">{r.nama}</p>
                      </div>
                    </div>
                    <div className="flex items-end gap-1 mb-3">
                      <span className={cn("text-[24px] font-black tabular-nums leading-none", tier.text)}>{r.avg}</span>
                      <span className="text-[13px] font-bold text-[hsl(var(--muted-foreground))] mb-0.5">%</span>
                    </div>
                    <div className="h-1.5 bg-[hsl(var(--muted))] overflow-hidden mb-4">
                      <div className="h-full transition-all" style={{ width: `${r.avg}%`, background: tier.bg }} />
                    </div>
                    <div className="space-y-2">
                      {categories.map((c) => {
                        const val = r[c.code] || 0;
                        const catTier = tierColor(val);
                        return (
                          <div key={c.code} className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] w-16 shrink-0 truncate">
                              {c.icon} {c.code}
                            </span>
                            <div className="flex-1 h-1 bg-[hsl(var(--muted))] overflow-hidden">
                              <div className="h-full" style={{ width: `${val}%`, background: catTier.bg }} />
                            </div>
                            <span className={cn("text-[10px] font-bold tabular-nums w-7 text-right", catTier.text)}>
                              {val}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* FULL RANKING TABLE */}
          {ranking.length >= 3 && (
            <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
              {/* Table header */}
              <div className="flex items-center px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
                <div className="w-10 text-center text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
                  #
                </div>
                <div className="flex-1 text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wide min-w-[160px]">
                  Puskesmas
                </div>
                {categories.map((c) => (
                  <div
                    key={c.code}
                    className="w-20 text-center text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wide"
                  >
                    {c.icon} {c.code}
                  </div>
                ))}
                <div className="w-24 text-center text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
                  Rata-rata
                </div>
              </div>

              {/* Rows */}
              {ranking.map((r, i) => {
                const tier = tierColor(r.avg);
                return (
                  <div
                    key={r.id}
                    className={cn(
                      "flex items-center px-4 py-3 border-b border-[hsl(var(--border))] last:border-b-0 hover:bg-[hsl(var(--muted))]/30 transition-colors",
                      i < 3 && "bg-[hsl(var(--warning))]/5",
                    )}
                  >
                    {/* Rank */}
                    <div className="w-10 text-center">
                      {i === 0 ? (
                        <div className="w-6 h-6 bg-amber-400 flex items-center justify-center mx-auto">
                          <span className="text-[11px] font-black text-white">1</span>
                        </div>
                      ) : i === 1 ? (
                        <div className="w-6 h-6 bg-slate-400 flex items-center justify-center mx-auto">
                          <span className="text-[11px] font-black text-white">2</span>
                        </div>
                      ) : i === 2 ? (
                        <div className="w-6 h-6 bg-orange-600 flex items-center justify-center mx-auto">
                          <span className="text-[11px] font-black text-white">3</span>
                        </div>
                      ) : (
                        <span className="text-[13px] font-bold text-[hsl(var(--muted-foreground))] tabular-nums">
                          {i + 1}
                        </span>
                      )}
                    </div>

                    {/* Name */}
                    <div className="flex-1 flex items-center gap-2 min-w-[160px]">
                      <div className="w-7 h-7 bg-[hsl(var(--muted))] flex items-center justify-center shrink-0">
                        <Building2 className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                      </div>
                      <span className="text-[13px] font-semibold text-[hsl(var(--foreground))] truncate">{r.nama}</span>
                    </div>

                    {/* Category scores */}
                    {categories.map((c) => {
                      const val = r[c.code] || 0;
                      const catTier = tierColor(val);
                      return (
                        <div key={c.code} className="w-20 flex flex-col items-center gap-1">
                          <span className={cn("text-[13px] font-bold tabular-nums", catTier.text)}>{val}%</span>
                          <div className="w-full h-1 bg-[hsl(var(--muted))] overflow-hidden">
                            <div
                              className="h-full transition-all"
                              style={{ width: `${val}%`, background: catTier.bg }}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {/* Average */}
                    <div className="w-24 flex flex-col items-center gap-1">
                      <span className={cn("text-[15px] font-black tabular-nums", tier.text)}>{r.avg}%</span>
                      <div className="w-full h-1.5 bg-[hsl(var(--muted))] overflow-hidden">
                        <div
                          className="h-full transition-all duration-500"
                          style={{ width: `${r.avg}%`, background: tier.bg }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
