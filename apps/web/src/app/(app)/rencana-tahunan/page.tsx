"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";

const BULAN_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

interface Month {
  bulan: number;
  nama: string;
  totalSasaran: number;
  terjadwal: number;
  selesai: number;
  dilewati: number;
  belum: number;
  progress: number;
}
interface Quarter {
  label: string;
  selesai: number;
  target: number;
  progress: number;
}
interface RencanaTahunan {
  tahun: number;
  totalSasaran: number;
  totalSelesai: number;
  totalTarget: number;
  progressTahunan: number;
  months: Month[];
  triwulan: Quarter[];
  semester: Quarter[];
}

function tier(p: number) {
  if (p >= 80) return { bar: "#059669", text: "#059669", soft: "rgba(5,150,105,0.12)" };
  if (p >= 50) return { bar: "#E8A33D", text: "#C07F1F", soft: "rgba(232,163,61,0.14)" };
  if (p >= 1) return { bar: "#E15A4F", text: "#E15A4F", soft: "rgba(225,90,79,0.12)" };
  return { bar: "hsl(var(--border))", text: "hsl(var(--muted-foreground))", soft: "transparent" };
}

export default function RencanaTahunanPage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [tahun, setTahun] = useState(currentYear);
  const { data, isLoading } = useQuery<RencanaTahunan>({
    queryKey: ["rencana-tahunan", "web", tahun],
    queryFn: async () => {
      const res = await fetch(`/api/rencana-tahunan?tahun=${tahun}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  return (
    <div className="w-full mx-auto pb-4 fade-in bg-canvas">
      {/* ── HERO ── */}
      <div className="relative overflow-hidden rounded-card bg-[#0C1B16] text-white border border-[#16352B] shadow-float">
        <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full bg-primary opacity-[0.14] blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,#123527_0%,transparent_55%)] pointer-events-none" />
        <div className="relative z-10 px-8 py-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#7CF5CE]/60 mb-2">Perencanaan</p>
            <h1 className="text-[30px] font-black tracking-[-0.03em] leading-none">Rencana Tahunan</h1>
            {data && (
              <p className="text-[13px] font-medium text-white/50 mt-2">
                {data.totalSelesai} selesai dari {data.totalTarget} target · {data.totalSasaran} sasaran
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {data && (
              <span className="inline-flex flex-col items-center h-14 justify-center px-5 rounded-card bg-primary-subtle text-primary border border-primary/30">
                <span className="text-[20px] font-black tabular-nums text-[#7CF5CE] leading-none">
                  {data.progressTahunan}%
                </span>
                <span className="text-[8px] font-extrabold uppercase tracking-[0.15em] text-[#7CF5CE]/60 mt-1">
                  Progress
                </span>
              </span>
            )}
            <div className="flex items-center gap-1 rounded-full bg-white/[0.08] border border-white/15 p-1">
              <button
                onClick={() => setTahun(tahun - 1)}
                className="w-9 h-9 flex items-center justify-center text-white/60 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="w-14 text-[14px] font-black text-white text-center tabular-nums">{tahun}</span>
              <button
                onClick={() => setTahun(tahun + 1)}
                className="w-9 h-9 flex items-center justify-center text-white/60 hover:text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6 space-y-8">
        {isLoading ? (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-2 border-[hsl(var(--border))] border-t-[hsl(var(--accent))] animate-spin rounded-full" />
          </div>
        ) : !data ? (
          <EmptyState
            icon={CalendarRange}
            title="Belum ada data"
            description="Generate rencana bulanan dulu untuk melihat rekap tahunan."
            actionLabel="Buat Rencana Bulanan"
            onAction={() => (window.location.href = "/rencana-bulanan")}
          />
        ) : (
          <>
            {/* Gantt 12 bulan */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[14px] font-extrabold uppercase tracking-wider">12 Bulan</h2>
                <div className="flex items-center gap-4 text-[10px] font-bold text-[hsl(var(--muted-foreground))]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-primary" /> ≥80%
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#E8A33D]" /> ≥50%
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#E15A4F]" /> &lt;50%
                  </span>
                </div>
              </div>
              <div className="rounded-card border border-border bg-surface shadow-subtle overflow-hidden">
                {data.months.map((m, idx) => {
                  const t = tier(m.progress);
                  const isCurrent = tahun === currentYear && m.bulan === currentMonth;
                  return (
                    <a
                      key={m.bulan}
                      href={`/rencana-bulanan?bulan=${m.bulan}&tahun=${tahun}`}
                      className={`group flex items-center gap-4 px-5 py-3 hover:bg-[hsl(var(--muted))]/20 transition-colors ${
                        idx !== 0 ? "border-t border-[hsl(var(--border))]/50" : ""
                      } ${isCurrent ? "bg-[hsl(var(--accent-light))]/30" : ""}`}
                    >
                      <div className="w-16 shrink-0 flex items-center gap-2">
                        <span className="text-[13px] font-black tabular-nums text-[hsl(var(--muted-foreground))]">
                          {String(m.bulan).padStart(2, "0")}
                        </span>
                        <span className="text-[13px] font-bold">{BULAN_SHORT[m.bulan - 1]}</span>
                      </div>
                      <div className="flex-1 h-6 rounded-md bg-[hsl(var(--muted))]/40 overflow-hidden relative">
                        <div
                          className="h-full rounded-md transition-all duration-500"
                          style={{ width: `${Math.min(m.progress, 100)}%`, background: t.bar }}
                        />
                        <span
                          className="absolute inset-0 flex items-center px-2 text-[10px] font-extrabold tabular-nums"
                          style={{ color: m.progress > 15 ? "#fff" : t.text }}
                        >
                          {m.progress}%
                        </span>
                      </div>
                      <div className="w-24 shrink-0 text-right text-[11px] font-bold tabular-nums text-[hsl(var(--muted-foreground))]">
                        {m.selesai}/{m.totalSasaran}
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Triwulan + Semester */}
            <div className="grid md:grid-cols-2 gap-6">
              {[
                { title: "Triwulan", items: data.triwulan },
                { title: "Semester", items: data.semester },
              ].map((block) => (
                <div key={block.title}>
                  <h2 className="text-[14px] font-extrabold uppercase tracking-wider mb-4">{block.title}</h2>
                  <div className="rounded-card border border-border bg-surface shadow-subtle overflow-hidden">
                    {block.items.map((q, idx) => {
                      const t = tier(q.progress);
                      return (
                        <div
                          key={q.label}
                          className={`flex items-center gap-4 px-5 py-4 ${idx !== 0 ? "border-t border-[hsl(var(--border))]/50" : ""}`}
                        >
                          <div className="w-20 shrink-0">
                            <p className="text-[13px] font-bold">{q.label}</p>
                            <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] tabular-nums">
                              {q.selesai}/{q.target}
                            </p>
                          </div>
                          <div className="flex-1 h-5 rounded-md bg-[hsl(var(--muted))]/40 overflow-hidden relative">
                            <div
                              className="h-full rounded-md transition-all duration-500"
                              style={{ width: `${Math.min(q.progress, 100)}%`, background: t.bar }}
                            />
                          </div>
                          <span
                            className="w-14 shrink-0 text-right text-[14px] font-black tabular-nums"
                            style={{ color: t.text }}
                          >
                            {q.progress}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
