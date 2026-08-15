"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Check, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Clock, Play, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";

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

  // Calendar grid
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
  const stats = [
    { label: "Progress", value: `${data?.progress ?? 0}%`, color: "text-[hsl(var(--accent))]" },
    { label: "Total", value: data?.totalSasaran ?? 0, color: "text-[hsl(var(--foreground))]" },
    {
      label: "Selesai",
      value: selesaiVal,
      color: selesaiVal > 0 ? "text-[hsl(var(--success))]" : "text-[hsl(var(--muted-foreground))]",
    },
    { label: "Terjadwal", value: data?.totalTerjadwal ?? 0, color: "text-[hsl(var(--accent))]" },
  ];

  return (
    <div className="pr-5 py-5 space-y-6 fade-in">
      <PageHeader
        title="Rencana Bulanan"
        description="Jadwal pemeriksaan sasaran per bulan"
        icon={<Calendar className="w-4 h-4" />}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="w-9 h-9 rounded-xl border border-[hsl(var(--border))] flex items-center justify-center hover:bg-[hsl(var(--muted))] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[15px] font-bold min-w-[150px] text-center">
              {BULAN_FULL[bulan - 1]} {tahun}
            </span>
            <button
              onClick={nextMonth}
              className="w-9 h-9 rounded-xl border border-[hsl(var(--border))] flex items-center justify-center hover:bg-[hsl(var(--muted))] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card-shell p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
              {s.label}
            </p>
            <p className={`text-[28px] font-bold tabular-nums ${s.color} mt-1`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="card-shell p-4 flex items-center gap-3 flex-wrap">
        <label className="text-[12px] font-semibold text-[hsl(var(--muted-foreground))]">Kapasitas sasaran/hari:</label>
        <Input
          type="number"
          min={1}
          max={50}
          value={kapasitas}
          onChange={(e) => setKapasitas(Number(e.target.value) || 1)}
          className="w-20 h-9"
        />
        <Button onClick={() => generateMut.mutate()} disabled={generateMut.isPending} size="sm">
          {generateMut.isPending ? (
            <>
              <Clock className="w-3.5 h-3.5 animate-spin" /> Mengenerate...
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" /> Jadwalkan
            </>
          )}
        </Button>
      </div>

      {/* Calendar + List */}
      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        {/* Calendar */}
        <div className="card-shell p-4">
          <p className="text-[13px] font-bold mb-3">
            {BULAN_FULL[bulan - 1]} {tahun}
          </p>
          <div className="grid grid-cols-6 gap-1 mb-1">
            {HARI.map((h) => (
              <div
                key={h}
                className="text-center text-[10px] font-bold uppercase text-[hsl(var(--muted-foreground))] py-1"
              >
                {h}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-6 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const items = itemsByDate[day] || [];
              const hasSelesai = items.some((it) => it.sudahDiperiksa);
              const hasTerjadwal = items.some((it) => it.status === "TERJADWAL" && !it.sudahDiperiksa);
              return (
                <div
                  key={day}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[11px] font-semibold relative ${
                    items.length > 0
                      ? hasSelesai
                        ? "bg-[hsl(var(--success-light))] text-[hsl(var(--success))]"
                        : hasTerjadwal
                          ? "bg-[hsl(var(--accent-light))] text-[hsl(var(--accent))]"
                          : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                      : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/50"
                  }`}
                >
                  {day}
                  {items.length > 0 && (
                    <span className="absolute bottom-0.5 right-0.5 text-[8px] font-bold bg-[hsl(var(--foreground))] text-[hsl(var(--background))] rounded-full w-3.5 h-3.5 flex items-center justify-center">
                      {items.length}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* List per kategori */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="card-shell p-8 text-center text-[13px] text-[hsl(var(--muted-foreground))] animate-pulse">
              Memuat jadwal...
            </div>
          ) : !data || data.kategori.length === 0 ? (
            <div className="card-shell p-12 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--accent-light))] flex items-center justify-center">
                <Calendar className="w-7 h-7 text-[hsl(var(--accent))] opacity-60" />
              </div>
              <div>
                <p className="text-[14px] font-bold">Belum ada jadwal</p>
                <p className="text-[12px] text-[hsl(var(--muted-foreground))] mt-1">
                  Klik tombol Jadwalkan untuk generate otomatis.
                </p>
              </div>
            </div>
          ) : (
            data.kategori.map((kat) => (
              <div key={kat.kategoriNama} className="card-shell overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
                  <span className="text-base">{kat.kategoriIcon}</span>
                  <span className="text-[13px] font-bold">{kat.kategoriNama}</span>
                  <span className="text-[11px] text-[hsl(var(--muted-foreground))] ml-auto bg-[hsl(var(--card))] px-2 py-0.5 rounded-full">
                    {kat.list.length} sasaran
                  </span>
                </div>
                <div>
                  {kat.list.map((item) => {
                    const badge = STATUS_BADGE[item.status] || STATUS_BADGE.BELUM;
                    return (
                      <div
                        key={item.sasaranId}
                        className="flex items-center gap-3 px-4 py-3 border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--muted))]/40 transition-colors"
                      >
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            item.sudahDiperiksa
                              ? "bg-[hsl(var(--success))] text-white"
                              : item.status === "TERJADWAL"
                                ? "bg-[hsl(var(--accent))] text-white"
                                : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                          }`}
                        >
                          {item.sudahDiperiksa ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : item.status === "TERJADWAL" ? (
                            <Clock className="w-4 h-4" />
                          ) : (
                            <Check className="w-4 h-4 opacity-0" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-semibold truncate">{item.nama}</span>
                            {item.prioritas === 1 && (
                              <span className="text-[9px] font-bold text-[hsl(var(--error))] bg-[hsl(var(--error-light))] px-1.5 py-0.5 rounded-md">
                                PRIORITAS
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[hsl(var(--muted-foreground))] truncate mt-0.5">
                            {item.sudahDiperiksa && item.tanggalPeriksa
                              ? `Diperiksa ${new Date(item.tanggalPeriksa).toLocaleDateString("id-ID")}`
                              : item.tanggalRencana
                                ? `Jadwal: ${new Date(item.tanggalRencana).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`
                                : item.alamat || "Belum dijadwalkan"}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${badge.cls}`}>
                            {badge.label}
                          </span>
                          {item.sudahDiperiksa ? (
                            <a
                              href="/pemeriksaan"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[hsl(var(--success))] text-white hover:opacity-90 transition-opacity"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Detail
                            </a>
                          ) : (
                            <>
                              <a
                                href="/pemeriksaan"
                                title="Isi pemeriksaan"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] hover:opacity-90 transition-opacity"
                              >
                                <ClipboardCheck className="w-3 h-3" /> Periksa
                              </a>
                              {item.rencanaId && (
                                <button
                                  onClick={() =>
                                    updateMut.mutate({ rencanaId: item.rencanaId as number, status: "DILEWATI" })
                                  }
                                  title="Tandai dilewati"
                                  className="p-1.5 rounded-lg hover:bg-[hsl(var(--error-light))] hover:text-[hsl(var(--error))] transition-colors"
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
    </div>
  );
}
