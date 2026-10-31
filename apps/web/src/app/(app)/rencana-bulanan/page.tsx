"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Clock, Play, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumberFlow } from "@/components/ui/number-flow";

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

const STATUS_VARIANT: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }
> = {
  TERJADWAL: { label: "Terjadwal", variant: "default" },
  SELESAI: { label: "Selesai", variant: "success" },
  DILEWATI: { label: "Dilewati", variant: "destructive" },
  BELUM: { label: "Belum", variant: "secondary" },
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
      const res = await fetch("/api/rencana-bulanan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rencanaId, status }),
      });
      if (!res.ok) throw new Error("Gagal update status");
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
    <div className="w-full fade-in min-h-screen bg-canvas">
      {/* ── MASTHEAD FLUSH LANGSUNG KE NAVBAR ── */}
      <div className="w-full bg-surface border-b border-border px-6 sm:px-8 py-5 sm:py-6">
        <div className="w-full max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-primary mb-1.5 sm:mb-2">
              Perencanaan
            </p>
            <h1 className="text-[22px] sm:text-[28px] font-black tracking-tight leading-none text-foreground">
              {BULAN_FULL[bulan - 1]} {tahun}
            </h1>
            <p className="text-[12px] sm:text-[13px] font-medium text-muted-foreground mt-2">
              <span className="tabular-nums font-bold text-foreground">
                <NumberFlow value={selesaiVal} />
              </span>
              /<NumberFlow value={data?.totalSasaran ?? 0} /> selesai ·{" "}
              <span className="tabular-nums font-bold text-foreground">
                <NumberFlow value={data?.totalTerjadwal ?? 0} />
              </span>{" "}
              terjadwal
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-full bg-surface-subtle border border-border p-1">
              <button
                type="button"
                onClick={prevMonth}
                className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-surface hover:text-foreground transition-colors rounded-full"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-surface hover:text-foreground transition-colors rounded-full"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <Button
              size="sm"
              onClick={() => generateMut.mutate()}
              disabled={generateMut.isPending}
              className="rounded-full shadow-xs gap-1.5"
            >
              {generateMut.isPending ? (
                <Clock className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              Jadwalkan
            </Button>
          </div>
        </div>
      </div>

      {/* ── CONTENT BODY (CANVAS) ── */}
      <div className="w-full max-w-[1600px] mx-auto px-6 sm:px-8 py-6 space-y-6">
        {/* ── STAT PILLS ── */}
        <div className="flex flex-wrap items-center gap-3">
          <Card className="px-5 py-2.5 bg-surface border-primary/20 shadow-subtle">
            <div className="flex flex-col items-center justify-center">
              <span className="text-[18px] font-black tabular-nums text-primary leading-none">
                <NumberFlow value={data?.progress ?? 0} suffix="%" />
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-primary/70 mt-1">
                Progress
              </span>
            </div>
          </Card>
          <Card className="px-5 py-2.5 bg-surface border-border shadow-subtle">
            <div className="flex flex-col items-center justify-center">
              <span className="text-[18px] font-black tabular-nums text-foreground leading-none">
                <NumberFlow value={data?.totalSasaran ?? 0} />
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground mt-1">
                Sasaran
              </span>
            </div>
          </Card>
          <Card className="px-5 py-2.5 bg-primary-subtle text-primary border-primary/20 shadow-subtle">
            <div className="flex flex-col items-center justify-center">
              <span className="text-[18px] font-black tabular-nums text-primary leading-none">
                <NumberFlow value={selesaiVal} />
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-primary/70 mt-1">
                Selesai
              </span>
            </div>
          </Card>
          <Card className="px-5 py-2.5 bg-surface border-amber-500/20 shadow-subtle">
            <div className="flex flex-col items-center justify-center">
              <span className="text-[18px] font-black tabular-nums text-amber-600 leading-none">
                <NumberFlow value={data?.totalTerjadwal ?? 0} />
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-amber-600/70 mt-1">
                Terjadwal
              </span>
            </div>
          </Card>
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
        <div className="pt-2">
          <Card className="overflow-hidden">
            <div className="grid grid-cols-6 border-b border-border bg-surface-subtle">
              {HARI.map((h) => (
                <div
                  key={h}
                  className="text-center text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground py-3 border-r border-border last:border-r-0"
                >
                  {h}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-6">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="aspect-[4/3] border-r border-b border-border/50 bg-surface-subtle/30"
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
                    className={`aspect-[4/3] border-r border-b border-border/50 p-2 flex flex-col transition-colors ${
                      isToday ? "bg-primary-subtle/40" : "hover:bg-surface-subtle/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[13px] font-bold tabular-nums ${
                          isToday
                            ? "w-6 h-6 flex items-center justify-center rounded-full bg-primary text-white text-[11px]"
                            : "text-muted-foreground"
                        }`}
                      >
                        {day}
                      </span>
                      {items.length > 0 && (
                        <span className="text-[10px] font-extrabold text-muted-foreground">{items.length}</span>
                      )}
                    </div>
                    {items.length > 0 && (
                      <div className="mt-auto space-y-1">
                        <div
                          className={`h-1.5 rounded-full ${
                            hasSelesai ? "bg-emerald-500" : hasTerjadwal ? "bg-primary" : "bg-border"
                          }`}
                        />
                        <div className="text-[11px] font-bold truncate text-muted-foreground">
                          {items[0].nama}
                          {items.length > 1 && ` +${items.length - 1}`}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Timeline per kategori */}
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-[13px] text-muted-foreground animate-pulse">Memuat jadwal...</div>
          ) : !data || data.kategori.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center gap-3">
              <Calendar className="w-8 h-8 text-muted-foreground opacity-50" />
              <p className="text-[14px] font-bold text-foreground">Belum ada jadwal</p>
              <p className="text-[12px] text-muted-foreground">Klik Jadwalkan Otomatis untuk generate.</p>
            </div>
          ) : (
            data.kategori.map((kat, katIdx) => (
              <div key={kat.kategoriNama} className={katIdx !== 0 ? "border-t-2 border-border" : ""}>
                <div className="flex items-center gap-3 px-5 py-3 bg-surface-subtle border-b border-border">
                  <span className="text-base">{kat.kategoriIcon}</span>
                  <span className="text-[13px] font-extrabold uppercase tracking-wider text-foreground">
                    {kat.kategoriNama}
                  </span>
                  <Badge variant="secondary" className="ml-auto text-[11px]">
                    {kat.list.length} sasaran
                  </Badge>
                </div>
                <div>
                  {kat.list.map((item) => {
                    const badge = STATUS_VARIANT[item.status] || STATUS_VARIANT.BELUM;
                    return (
                      <div
                        key={item.sasaranId}
                        className="flex items-center gap-4 px-5 py-3 border-b border-border/50 last:border-0 hover:bg-surface-subtle/30 transition-colors"
                      >
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            item.sudahDiperiksa
                              ? "bg-emerald-500"
                              : item.status === "TERJADWAL"
                                ? "bg-primary"
                                : "bg-border"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-bold text-foreground truncate">{item.nama}</span>
                            {item.prioritas === 1 && (
                              <Badge variant="destructive" className="text-[9px] uppercase px-1.5 py-0">
                                PRIORITAS
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {item.sudahDiperiksa && item.tanggalPeriksa
                              ? `Diperiksa ${new Date(item.tanggalPeriksa).toLocaleDateString("id-ID")}`
                              : item.tanggalRencana
                                ? `Jadwal: ${new Date(item.tanggalRencana).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`
                                : item.alamat || "Belum dijadwalkan"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={badge.variant} className="text-[10px]">
                            {badge.label}
                          </Badge>
                          {item.sudahDiperiksa ? (
                            <Button asChild size="sm" variant="success" className="h-7 text-xs">
                              <Link href="/pemeriksaan">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Detail
                              </Link>
                            </Button>
                          ) : (
                            <>
                              <Button asChild size="sm" className="h-7 text-xs">
                                <Link href="/pemeriksaan">
                                  <ClipboardCheck className="w-3 h-3 mr-1" /> Periksa
                                </Link>
                              </Button>
                              {item.rencanaId && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    updateMut.mutate({ rencanaId: item.rencanaId as number, status: "DILEWATI" })
                                  }
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </Button>
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
        </Card>
      </div>
    </div>
  );
}
