"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Clock, Play, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

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
const HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

interface RencanaItem {
  sasaranId: number;
  nama: string;
  alamat: string | null;
  rencanaId: number | null;
  tanggalRencana: string | null;
  status: string;
  prioritas: number;
  sudahDiperiksa: boolean;
  tanggalPeriksa: string | null;
}
interface Kategori {
  kategoriNama: string;
  kategoriIcon: string;
  list: RencanaItem[];
}
interface RencanaData {
  bulan: number;
  tahun: number;
  bulanNama: string;
  totalSasaran: number;
  totalSelesai: number;
  totalTerjadwal: number;
  progress: number;
  kategori: Kategori[];
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  TERJADWAL: { label: "Terjadwal", cls: "bg-[hsl(var(--accent-light))] text-[hsl(var(--accent))]" },
  SELESAI: { label: "Selesai", cls: "bg-[hsl(var(--success-light))] text-[hsl(var(--success))]" },
  DILEWATI: { label: "Dilewati", cls: "bg-[hsl(var(--error-light))] text-[hsl(var(--error))]" },
  BELUM: { label: "Belum", cls: "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]" },
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}
function getFirstDayOfWeek(year: number, month: number) {
  const d = new Date(year, month - 1, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

export default function RencanaBulananPage() {
  const sp = useSearchParams();
  const router = useRouter();
  useSession();
  const now = new Date();
  const [bulan, setBulan] = useState(Number(sp.get("bulan")) || now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());
  const [kapasitas, setKapasitas] = useState(5);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<RencanaData>({
    queryKey: ["rencana-bulanan", bulan, tahun],
    queryFn: async () => {
      const res = await fetch(`/api/rencana-bulanan?bulan=${bulan}&tahun=${tahun}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const generateMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/rencana-bulanan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulan, tahun, kapasitasPerHari: kapasitas }),
      });
      if (!res.ok) throw new Error("Gagal generate");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rencana-bulanan"] }),
  });

  const updateMut = useMutation({
    mutationFn: async ({ rencanaId, status }: { rencanaId: number; status: string }) => {
      const res = await fetch("/api/rencana-bulanan/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rencanaId, status }),
      });
      if (!res.ok) throw new Error("Gagal update");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rencana-bulanan"] }),
  });

  const prevMonth = () => {
    const nb = bulan === 1 ? 12 : bulan - 1;
    const nt = bulan === 1 ? tahun - 1 : tahun;
    setBulan(nb);
    setTahun(nt);
    router.replace(`/rencana-bulanan?bulan=${nb}&tahun=${nt}`);
  };
  const nextMonth = () => {
    const nb = bulan === 12 ? 1 : bulan + 1;
    const nt = bulan === 12 ? tahun + 1 : tahun;
    setBulan(nb);
    setTahun(nt);
    router.replace(`/rencana-bulanan?bulan=${nb}&tahun=${nt}`);
  };

  const daysInMonth = getDaysInMonth(tahun, bulan);
  const firstDay = getFirstDayOfWeek(tahun, bulan);
  const allItems = data?.kategori?.flatMap((k) => k.list) ?? [];
  const itemsByDate: Record<number, RencanaItem[]> = {};
  for (const item of allItems) {
    if (item.tanggalRencana) {
      const d = new Date(item.tanggalRencana).getDate();
      if (!itemsByDate[d]) itemsByDate[d] = [];
      itemsByDate[d].push(item);
    }
  }

  const selesaiVal = data?.totalSelesai ?? 0;
  const today = new Date();
  const isCurrentMonth = bulan === today.getMonth() + 1 && tahun === today.getFullYear();
  const todayDate = isCurrentMonth ? today.getDate() : -1;

  return (
    <div className="w-full mx-auto pb-4 fade-in bg-canvas">
      {/* ── HERO ── */}
      <div className="relative overflow-hidden rounded-card bg-[#0C1B16] text-white border border-[#16352B] shadow-float">
        <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full bg-primary opacity-[0.14] blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,#123527_0%,transparent_55%)] pointer-events-none" />
        <div className="relative z-10 px-8 py-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#7CF5CE]/60 mb-2">Perencanaan</p>
            <h1 className="text-[30px] font-black tracking-[-0.03em] leading-none">
              {BULAN_FULL[bulan - 1]} {tahun}
            </h1>
            <p className="text-[13px] font-medium text-white/50 mt-2">
              {selesaiVal}/{data?.totalSasaran ?? 0} selesai · {data?.totalTerjadwal ?? 0} terjadwal
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-full bg-white/[0.08] border border-white/15 p-1">
              <button
                onClick={prevMonth}
                className="w-9 h-9 flex items-center justify-center text-white/60 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextMonth}
                className="w-9 h-9 flex items-center justify-center text-white/60 hover:text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => generateMut.mutate()}
              disabled={generateMut.isPending}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-[#BEF264] text-[#06281E] text-[12px] font-extrabold hover:brightness-95 transition disabled:opacity-50"
            >
              {generateMut.isPending ? (
                <Clock className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              Jadwalkan
            </button>
          </div>
        </div>
      </div>

      {/* ── STAT PILLS ── */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="inline-flex flex-col items-center h-14 justify-center px-5 rounded-card bg-surface border border-primary/20 shadow-subtle">
          <span className="text-[18px] font-black tabular-nums text-primary leading-none">{data?.progress ?? 0}%</span>
          <span className="text-[8px] font-extrabold uppercase tracking-[0.15em] text-primary/70 mt-1">Progress</span>
        </span>
        <span className="inline-flex flex-col items-center h-14 justify-center px-5 rounded-card bg-surface border border-border shadow-subtle">
          <span className="text-[18px] font-black tabular-nums text-foreground leading-none">
            {data?.totalSasaran ?? 0}
          </span>
          <span className="text-[8px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground mt-1">
            Sasaran
          </span>
        </span>
        <span className="inline-flex flex-col items-center h-14 justify-center px-5 rounded-card bg-primary-subtle text-primary border border-primary/20 shadow-subtle">
          <span className="text-[18px] font-black tabular-nums text-primary leading-none">{selesaiVal}</span>
          <span className="text-[8px] font-extrabold uppercase tracking-[0.15em] text-primary/70 mt-1">Selesai</span>
        </span>
        <span className="inline-flex flex-col items-center h-14 justify-center px-5 rounded-card bg-surface border border-[#E8A33D]/20 shadow-subtle">
          <span className="text-[18px] font-black tabular-nums text-[#C07F1F] leading-none">
            {data?.totalTerjadwal ?? 0}
          </span>
          <span className="text-[8px] font-extrabold uppercase tracking-[0.15em] text-[#C07F1F]/70 mt-1">
            Terjadwal
          </span>
        </span>
        <div className="flex items-center gap-2 ml-auto">
          <label className="text-[11px] font-bold text-muted-foreground">Kapasitas/hari:</label>
          <Input
            type="number"
            min={1}
            max={50}
            value={kapasitas}
            onChange={(e) => setKapasitas(Number(e.target.value) || 1)}
            className="w-20 h-9"
          />
        </div>
      </div>

      {/* Kalender hero full-width */}
      <div className="pt-6">
        <div className="rounded-card border border-border bg-surface shadow-subtle overflow-hidden">
          <div className="grid grid-cols-6 border-b border-border bg-surface-subtle">
            {HARI.map((h) => (
              <div
                key={h}
                className="text-center text-[11px] font-extrabold uppercase tracking-widest text-[hsl(var(--muted-foreground))] py-3 border-r border-[hsl(var(--border))] last:border-r-0"
              >
                {h}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-6">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="aspect-[4/3] border-r border-b border-[hsl(var(--border))]/50 bg-[hsl(var(--muted))]/10"
              />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const items = itemsByDate[day] || [];
              const hasSelesai = items.some((it) => it.sudahDiperiksa);
              const hasTerjadwal = items.some((it) => it.status === "TERJADWAL" && !it.sudahDiperiksa);
              const isToday = day === todayDate;
              return (
                <div
                  key={day}
                  className={`aspect-[4/3] border-r border-b border-[hsl(var(--border))]/50 p-2 flex flex-col transition-colors ${
                    isToday ? "bg-[hsl(var(--accent-light))]/60" : "hover:bg-[hsl(var(--muted))]/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[13px] font-bold tabular-nums ${
                        isToday
                          ? "w-6 h-6 flex items-center justify-center rounded-full bg-[hsl(var(--accent))] text-white text-[11px]"
                          : "text-[hsl(var(--muted-foreground))]"
                      }`}
                    >
                      {day}
                    </span>
                    {items.length > 0 && (
                      <span className="text-[10px] font-extrabold text-[hsl(var(--muted-foreground))]">
                        {items.length}
                      </span>
                    )}
                  </div>
                  {items.length > 0 && (
                    <div className="mt-auto space-y-1">
                      <div
                        className={`h-1.5 rounded-full ${
                          hasSelesai
                            ? "bg-[hsl(var(--success))]"
                            : hasTerjadwal
                              ? "bg-[hsl(var(--accent))]"
                              : "bg-[hsl(var(--border))]"
                        }`}
                      />
                      <div className="text-[9px] font-bold truncate text-[hsl(var(--muted-foreground))]">
                        {items[0].nama}
                        {items.length > 1 && ` +${items.length - 1}`}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Timeline per kategori */}
      <div className="rounded-card border border-border bg-surface shadow-subtle overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-[13px] text-[hsl(var(--muted-foreground))] animate-pulse">
            Memuat jadwal...
          </div>
        ) : !data || data.kategori.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center gap-3">
            <Calendar className="w-8 h-8 text-[hsl(var(--muted-foreground))] opacity-50" />
            <p className="text-[14px] font-bold">Belum ada jadwal</p>
            <p className="text-[12px] text-[hsl(var(--muted-foreground))]">Klik Jadwalkan Otomatis untuk generate.</p>
          </div>
        ) : (
          data.kategori.map((kat, katIdx) => (
            <div key={kat.kategoriNama} className={katIdx !== 0 ? "border-t-2 border-[hsl(var(--border))]" : ""}>
              <div className="flex items-center gap-3 px-5 py-3 bg-[hsl(var(--muted))]/30 border-b border-[hsl(var(--border))]">
                <span className="text-base">{kat.kategoriIcon}</span>
                <span className="text-[13px] font-extrabold uppercase tracking-wider">{kat.kategoriNama}</span>
                <span className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] ml-auto">
                  {kat.list.length} sasaran
                </span>
              </div>
              <div>
                {kat.list.map((item) => {
                  const badge = STATUS_BADGE[item.status] || STATUS_BADGE.BELUM;
                  return (
                    <div
                      key={item.sasaranId}
                      className="flex items-center gap-4 px-5 py-3 border-b border-[hsl(var(--border))]/50 last:border-0 hover:bg-[hsl(var(--muted))]/20 transition-colors"
                    >
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          item.sudahDiperiksa
                            ? "bg-[hsl(var(--success))]"
                            : item.status === "TERJADWAL"
                              ? "bg-[hsl(var(--accent))]"
                              : "bg-[hsl(var(--border))]"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-bold truncate">{item.nama}</span>
                          {item.prioritas === 1 && (
                            <span className="text-[9px] font-extrabold text-[hsl(var(--error))]">PRIORITAS</span>
                          )}
                        </div>
                        <div className="text-[11px] text-[hsl(var(--muted-foreground))] truncate">
                          {item.sudahDiperiksa && item.tanggalPeriksa
                            ? `Diperiksa ${new Date(item.tanggalPeriksa).toLocaleDateString("id-ID")}`
                            : item.tanggalRencana
                              ? `Jadwal: ${new Date(item.tanggalRencana).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`
                              : item.alamat || "Belum dijadwalkan"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded ${badge.cls}`}>{badge.label}</span>
                        {item.sudahDiperiksa ? (
                          <a
                            href="/pemeriksaan"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-bold bg-[hsl(var(--success))] text-white hover:opacity-90"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Detail
                          </a>
                        ) : (
                          <>
                            <a
                              href="/pemeriksaan"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-bold bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] hover:opacity-90"
                            >
                              <ClipboardCheck className="w-3 h-3" /> Periksa
                            </a>
                            {item.rencanaId && (
                              <button
                                onClick={() =>
                                  updateMut.mutate({ rencanaId: item.rencanaId as number, status: "DILEWATI" })
                                }
                                className="p-1.5 rounded hover:bg-[hsl(var(--error-light))] hover:text-[hsl(var(--error))] transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
