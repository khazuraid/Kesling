"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, CalendarRange, Check, CheckCircle2, Clock, Loader2, Play, RotateCcw, X } from "lucide-react";
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
  SELESAI: { label: "Selesai", cls: "bg-[hsl(var(--success))/0.12] text-[hsl(var(--success))]" },
  DILEWATI: { label: "Dilewati", cls: "bg-[hsl(var(--error))/0.12] text-[hsl(var(--error))]" },
  BELUM: { label: "Belum", cls: "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]" },
};

export default function RencanaBulananPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "OPERATOR";
  const isOperator = userRole === "OPERATOR";
  const now = new Date();
  const [bulan, setBulan] = useState(Number(sp.get("bulan")) || now.getMonth() + 1);
  const [tahun, setTahun] = useState(now.getFullYear());
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
        body: JSON.stringify({ bulan, tahun }),
      });
      if (!res.ok) throw new Error("Gagal generate");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rencana-bulanan"] }),
  });

  const updateMut = useMutation({
    mutationFn: async ({ rencanaId, status }: { rencanaId: number; status: string }) => {
      const res = await fetch(`/api/rencana-bulanan/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rencanaId, status }),
      });
      if (!res.ok) throw new Error("Gagal update");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rencana-bulanan"] }),
  });

  const pickMonth = () => {
    router.push(`/rencana-bulanan?bulan=${(bulan % 12) + 1}&tahun=${bulan === 12 ? tahun + 1 : tahun}`);
  };

  const prevMonth = () => {
    if (bulan === 1) {
      setBulan(12);
      setTahun(tahun - 1);
    } else setBulan(bulan - 1);
  };
  const nextMonth = () => {
    if (bulan === 12) {
      setBulan(1);
      setTahun(tahun + 1);
    } else setBulan(bulan + 1);
  };

  return (
    <div className="w-full min-h-[calc(100dvh-4rem)] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <div className="h-14 border-b border-[hsl(var(--border))] px-5 flex items-center justify-between bg-[hsl(var(--card))] sticky top-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <Calendar className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          <div className="min-w-0">
            <h1 className="text-[13px] font-black uppercase tracking-widest">Rencana Bulanan</h1>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">
              Jadwal pemeriksaan sasaran per bulan
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-2 rounded hover:bg-[hsl(var(--muted))]">
            <Calendar className="w-4 h-4" />
          </button>
          <span className="text-[13px] font-bold px-2 min-w-[140px] text-center">
            {BULAN_FULL[bulan - 1]} {tahun}
          </span>
          <button onClick={nextMonth} className="p-2 rounded hover:bg-[hsl(var(--muted))]">
            <CalendarRange className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg p-4 col-span-1 flex flex-col gap-1">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
              Progress
            </span>
            <span className="text-2xl font-black">{data?.progress ?? 0}%</span>
          </div>
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg p-4">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
              Total
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black">{data?.totalSasaran ?? 0}</span>
            </div>
          </div>
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg p-4">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
              Selesai
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-[hsl(var(--success))]">{data?.totalSelesai ?? 0}</span>
            </div>
          </div>
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg p-4">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
              Terjadwal
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-[hsl(var(--accent))]">{data?.totalTerjadwal ?? 0}</span>
            </div>
          </div>
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg p-4 flex items-end justify-end">
            <button
              onClick={() => generateMut.mutate()}
              disabled={generateMut.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[hsl(var(--accent))] text-white text-[12px] font-bold hover:opacity-85 disabled:opacity-50"
            >
              {generateMut.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              Jadwalkan Otomatis
            </button>
          </div>
        </div>

        {/* Per kategori */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-[hsl(var(--muted-foreground))]">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat...
          </div>
        ) : data?.kategori.length === 0 ? (
          <div className="text-center py-20 text-[hsl(var(--muted-foreground))]">
            Belum ada sasaran. Daftarkan lewat Data Dasar.
          </div>
        ) : (
          <div className="space-y-5">
            {data?.kategori.map((kat) => (
              <div
                key={kat.kategoriNama}
                className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg overflow-hidden"
              >
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]">
                  <span className="text-sm font-black">{kat.kategoriNama}</span>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{kat.list.length} sasaran</span>
                </div>
                <div>
                  {kat.list.map((item) => {
                    const badge = STATUS_BADGE[item.status] || STATUS_BADGE.BELUM;
                    return (
                      <div
                        key={item.sasaranId}
                        className="flex items-center gap-3 px-4 py-2.5 border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--muted))]"
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${item.sudahDiperiksa ? "bg-[hsl(var(--success))] text-white" : item.status === "TERJADWAL" ? "bg-[hsl(var(--accent))] text-white" : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"}`}
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
                            <span className="text-[13px] font-bold truncate">{item.nama}</span>
                            {item.prioritas === 1 && (
                              <span className="text-[9px] font-bold text-[hsl(var(--error))] bg-[hsl(var(--error))/0.1] px-1.5 py-0.5 rounded">
                                PRIORITAS
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">
                            {item.sudahDiperiksa && item.tanggalPeriksa
                              ? `Diperiksa ${new Date(item.tanggalPeriksa).toLocaleDateString("id-ID")}`
                              : item.tanggalRencana
                                ? `Jadwal: ${new Date(item.tanggalRencana).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`
                                : item.alamat || "Belum dijadwalkan"}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded ${badge.cls}`}>{badge.label}</span>
                          {item.sudahDiperiksa ? (
                            <a
                              href={`/pemeriksaan`}
                              className="text-[hsl(var(--accent))] text-[10px] font-bold hover:underline"
                            >
                              Lihat
                            </a>
                          ) : (
                            <div className="flex items-center gap-1">
                              {item.rencanaId && (
                                <>
                                  <button
                                    onClick={() => updateMut.mutate({ rencanaId: item.rencanaId!, status: "SELESAI" })}
                                    title="Tandai selesai"
                                    className="p-1 rounded hover:bg-[hsl(var(--success))/0.1] hover:text-[hsl(var(--success))]"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => updateMut.mutate({ rencanaId: item.rencanaId!, status: "DILEWATI" })}
                                    title="Tandai dilewati"
                                    className="p-1 rounded hover:bg-[hsl(var(--error))/0.1] hover:text-[hsl(var(--error))]"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                              {!item.rencanaId && (
                                <button
                                  onClick={() => generateMut.mutate()}
                                  title="Jadwalkan"
                                  className="p-1 rounded hover:bg-[hsl(var(--accent))/0.1] hover:text-[hsl(var(--accent))]"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
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
