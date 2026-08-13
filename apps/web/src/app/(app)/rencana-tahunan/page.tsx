"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarRange, TrendingUp } from "lucide-react";

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
  return p >= 80 ? "text-[hsl(var(--success))]" : p >= 50 ? "text-[hsl(var(--accent))]" : "text-[hsl(var(--error))]";
}

export default function RencanaTahunanPage() {
  const tahun = new Date().getFullYear();
  const { data, isLoading } = useQuery<RencanaTahunan>({
    queryKey: ["rencana-tahunan", "web", tahun],
    queryFn: async () => {
      const res = await fetch(`/api/rencana-tahunan?tahun=${tahun}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  return (
    <div className="w-full min-h-[calc(100dvh-4rem)] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <div className="h-14 border-b border-[hsl(var(--border))] px-5 flex items-center gap-3 bg-[hsl(var(--card))] sticky top-0 z-10">
        <CalendarRange className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
        <div>
          <h1 className="text-[13px] font-black uppercase tracking-widest">Rencana Tahunan</h1>
          <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Overview pemeriksaan {tahun}</p>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {isLoading ? (
          <div className="flex justify-center py-20 text-[hsl(var(--muted-foreground))] animate-pulse">Memuat...</div>
        ) : data ? (
          <>
            {/* Tahunan summary */}
            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg p-5 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-[hsl(var(--accent-light))] flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-[hsl(var(--accent))]" />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
                    Progress Tahunan
                  </p>
                  <p className={`text-3xl font-black ${pctColor(data.progressTahunan)}`}>{data.progressTahunan}%</p>
                </div>
              </div>
              <div className="flex gap-6 text-center">
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Selesai</p>
                  <p className="text-xl font-black text-[hsl(var(--success))]">{data.totalSelesai}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Target</p>
                  <p className="text-xl font-black">{data.totalTarget}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-[hsl(var(--muted-foreground))]">Sasaran</p>
                  <p className="text-xl font-black text-[hsl(var(--accent))]">{data.totalSasaran}</p>
                </div>
              </div>
            </div>

            {/* Triwulan + Semester */}
            <div className="grid md:grid-cols-2 gap-5">
              <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm font-black">
                  Rekap Triwulan
                </div>
                {data.triwulan.map((q) => (
                  <div
                    key={q.label}
                    className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))] last:border-0"
                  >
                    <div>
                      <p className="text-[13px] font-bold">{q.label}</p>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                        {q.selesai}/{q.target} pemeriksaan
                      </p>
                    </div>
                    <span className={`text-lg font-black ${pctColor(q.progress)}`}>{q.progress}%</span>
                  </div>
                ))}
              </div>
              <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm font-black">
                  Rekap Semester
                </div>
                {data.semester.map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))] last:border-0"
                  >
                    <div>
                      <p className="text-[13px] font-bold">{s.label}</p>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                        {s.selesai}/{s.target} pemeriksaan
                      </p>
                    </div>
                    <span className={`text-lg font-black ${pctColor(s.progress)}`}>{s.progress}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 12 bulan */}
            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] text-sm font-black">
                12 Bulan
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
                {data.months.map((m) => (
                  <a
                    key={m.bulan}
                    href={`/rencana-bulanan?bulan=${m.bulan}&tahun=${tahun}`}
                    className="flex flex-col gap-1 p-4 border border-transparent border-r-[hsl(var(--border))] border-b-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black ${m.progress >= 80 ? "bg-[hsl(var(--success))] text-white" : m.progress >= 50 ? "bg-[hsl(var(--accent))] text-white" : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"}`}
                    >
                      {m.bulan}
                    </div>
                    <p className="text-[12px] font-bold">{m.nama}</p>
                    <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                      {m.selesai}/{m.totalSasaran} selesai
                    </p>
                    <span className={`text-[11px] font-black ${pctColor(m.progress)}`}>{m.progress}%</span>
                  </a>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
