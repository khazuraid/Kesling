"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Loader2,
  Play,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";

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

  const stats = [
    { label: "Progress", value: `${data?.progress ?? 0}%`, color: "text-[hsl(var(--accent))]" },
    { label: "Total", value: data?.totalSasaran ?? 0, color: "text-[hsl(var(--foreground))]" },
    { label: "Selesai", value: data?.totalSelesai ?? 0, color: "text-[hsl(var(--success))]" },
    { label: "Terjadwal", value: data?.totalTerjadwal ?? 0, color: "text-[hsl(var(--accent))]" },
  ];

  return (
    <div className="w-full min-h-[calc(100dvh-4rem)] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <div className="h-14 border-b border-[hsl(var(--border))] px-5 flex items-center justify-between bg-[hsl(var(--card))] sticky top-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[hsl(var(--accent-light))] border border-[hsl(var(--accent))/0.15] flex items-center justify-center">
            <Calendar className="w-4 h-4 text-[hsl(var(--accent))]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[14px] font-bold tracking-tight">Rencana Bulanan</h1>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))] truncate">
              Jadwal pemeriksaan sasaran per bulan
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="w-8 h-8 rounded-lg border border-[hsl(var(--border))] flex items-center justify-center hover:bg-[hsl(var(--muted))] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[14px] font-bold px-3 min-w-[140px] text-center">
            {BULAN_FULL[bulan - 1]} {tahun}
          </span>
          <button
            onClick={nextMonth}
            className="w-8 h-8 rounded-lg border border-[hsl(var(--border))] flex items-center justify-center hover:bg-[hsl(var(--muted))] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-[var(--shadow)]"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                {s.label}
              </span>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 shadow-[var(--shadow)] flex items-end justify-end gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                Sasaran/Hari
              </span>
              <input
                type="number"
                min={1}
                max={50}
                value={kapasitas}
                onChange={(e) => setKapasitas(Math.max(1, Number(e.target.value) || 1))}
                className="w-20 border border-[hsl(var(--border))] rounded-lg px-2 py-1.5 text-[14px] font-bold text-center bg-[hsl(var(--background))] outline-none focus:border-[hsl(var(--accent))]"
              />
            </label>
            <button
              onClick={() => generateMut.mutate()}
              disabled={generateMut.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] text-[12px] font-bold hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm"
            >
              {generateMut.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              Jadwalkan
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-[hsl(var(--muted-foreground))]">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat...
          </div>
        ) : data?.kategori.length === 0 ? (
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] py-20 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--accent-light))] flex items-center justify-center">
              <Calendar className="w-7 h-7 text-[hsl(var(--accent))] opacity-60" />
            </div>
            <div>
              <p className="text-[14px] font-bold">Belum ada sasaran</p>
              <p className="text-[12px] text-[hsl(var(--muted-foreground))] mt-1">Daftarkan lewat Data Dasar.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {data?.kategori.map((kat) => (
              <div
                key={kat.kategoriNama}
                className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden shadow-[var(--shadow)]"
              >
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--accent-light))]/50">
                  <span className="text-base">{kat.kategoriIcon}</span>
                  <span className="text-[14px] font-bold">{kat.kategoriNama}</span>
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
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.sudahDiperiksa ? "bg-[hsl(var(--success))] text-white" : item.status === "TERJADWAL" ? "bg-[hsl(var(--accent))] text-white" : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"}`}
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
                                  onClick={() => updateMut.mutate({ rencanaId: item.rencanaId!, status: "DILEWATI" })}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
