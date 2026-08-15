"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarRange, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

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

function pctColor(p: number) {
  return p >= 80
    ? "text-[hsl(var(--success))]"
    : p >= 50
      ? "text-[hsl(var(--accent))]"
      : p >= 1
        ? "text-[hsl(var(--error))]"
        : "text-[hsl(var(--muted-foreground))]";
}
function pctBg(p: number) {
  return p >= 80
    ? "bg-[hsl(var(--success))] text-white"
    : p >= 50
      ? "bg-[hsl(var(--accent))] text-white"
      : p >= 1
        ? "bg-[hsl(var(--error))] text-white"
        : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]";
}

export default function RencanaTahunanPage() {
  const currentYear = new Date().getFullYear();
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
    <div className="pr-5 py-5 space-y-6 fade-in">
      <PageHeader
        title="Rencana Tahunan"
        description={`Overview pemeriksaan tahun ${tahun}`}
        icon={<CalendarRange className="w-4 h-4" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setTahun(tahun - 1)}>
              ‹
            </Button>
            <span className="text-[15px] font-bold min-w-[60px] text-center">{tahun}</span>
            <Button variant="outline" size="sm" onClick={() => setTahun(tahun + 1)}>
              ›
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-20 text-[13px] text-[hsl(var(--muted-foreground))] animate-pulse">
          Memuat...
        </div>
      ) : data ? (
        <>
          {/* Tahunan summary */}
          <div className="card-shell p-6 flex items-center justify-between flex-wrap gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--accent-light))] border border-[hsl(var(--accent))]/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-[hsl(var(--accent))]" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                  Progress Tahunan
                </p>
                <p className={`text-[36px] font-bold leading-none ${pctColor(data.progressTahunan)}`}>
                  {data.progressTahunan}%
                </p>
              </div>
            </div>
            <div className="flex gap-8 text-center">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Selesai</p>
                <p className="text-[24px] font-bold text-[hsl(var(--success))]">{data.totalSelesai}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Target</p>
                <p className="text-[24px] font-bold">{data.totalTarget}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Sasaran</p>
                <p className="text-[24px] font-bold text-[hsl(var(--accent))]">{data.totalSasaran}</p>
              </div>
            </div>
          </div>

          {/* Triwulan + Semester */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="card-shell overflow-hidden">
              <div className="px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--accent-light))]/40">
                <span className="text-[14px] font-bold">Rekap Triwulan</span>
              </div>
              {data.triwulan.map((q) => (
                <div
                  key={q.label}
                  className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))] last:border-0"
                >
                  <div>
                    <p className="text-[14px] font-semibold">{q.label}</p>
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                      {q.selesai}/{q.target} pemeriksaan
                    </p>
                  </div>
                  <span className={`text-[20px] font-bold ${pctColor(q.progress)}`}>{q.progress}%</span>
                </div>
              ))}
            </div>
            <div className="card-shell overflow-hidden">
              <div className="px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--accent-light))]/40">
                <span className="text-[14px] font-bold">Rekap Semester</span>
              </div>
              {data.semester.map((s) => (
                <div
                  key={s.label}
                  className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))] last:border-0"
                >
                  <div>
                    <p className="text-[14px] font-semibold">{s.label}</p>
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                      {s.selesai}/{s.target} pemeriksaan
                    </p>
                  </div>
                  <span className={`text-[20px] font-bold ${pctColor(s.progress)}`}>{s.progress}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* 12 bulan grid */}
          <div className="card-shell overflow-hidden">
            <div className="px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--accent-light))]/40">
              <span className="text-[14px] font-bold">12 Bulan</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {data.months.map((m) => (
                <a
                  key={m.bulan}
                  href={`/rencana-bulanan?bulan=${m.bulan}&tahun=${tahun}`}
                  className="flex flex-col gap-2 p-4 border-r border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--accent-light))]/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-bold ${pctBg(m.progress)}`}
                    >
                      {m.bulan}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold">{BULAN_SHORT[m.bulan - 1]}</p>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                        {m.selesai}/{m.totalSasaran}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${m.progress >= 80 ? "bg-[hsl(var(--success))]" : m.progress >= 50 ? "bg-[hsl(var(--accent))]" : m.progress >= 1 ? "bg-[hsl(var(--error))]" : "bg-transparent"}`}
                        style={{ width: `${Math.min(m.progress, 100)}%` }}
                      />
                    </div>
                    <span className={`text-[12px] font-bold ${pctColor(m.progress)}`}>{m.progress}%</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="card-shell py-20 flex flex-col items-center justify-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--accent-light))] flex items-center justify-center">
            <CalendarRange className="w-8 h-8 text-[hsl(var(--accent))] opacity-60" />
          </div>
          <div>
            <p className="text-[15px] font-bold">Belum ada data</p>
            <p className="text-[13px] text-[hsl(var(--muted-foreground))] mt-1">Generate rencana bulanan dulu.</p>
          </div>
          <Button asChild size="sm">
            <a href="/rencana-bulanan">Buat Rencana Bulanan</a>
          </Button>
        </div>
      )}
    </div>
  );
}
