"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowUpRight, CheckCircle2, Download, Info, TrendingUp } from "lucide-react";
import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LaporanFilter } from "@/components/laporan-filter";
import { ComplianceBar } from "@/components/ui/compliance-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { useLaporanFilter } from "@/hooks/use-laporan-filter";

const BULAN_NAMES = [
  "",
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

interface CategoryScore {
  id: number;
  code: string;
  nama: string;
  icon: string;
  isRowBased: boolean;
  pct: number;
  hasData: boolean;
  num: number;
  den: number;
  laporanCount: number;
  status: string | null;
}

interface DashboardData {
  puskesmas: { id: number; nama: string } | null;
  categories: CategoryScore[];
  targets: Record<string, number>;
}

export default function DashboardPkmPage() {
  const { data: session } = useSession();
  const { bulan, tahun } = useLaporanFilter();
  const pkmId = (session?.user as any)?.puskesmasId;

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard-pkm", pkmId, bulan, tahun],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/puskesmas?puskesmasId=${pkmId}&bulan=${bulan}&tahun=${tahun}`);
      if (!res.ok) throw new Error("Gagal memuat dashboard");
      return res.json();
    },
    enabled: !!pkmId,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const categories = data?.categories || [];
  const targets = data?.targets || {};

  const { summary, chartData, achievedCount, totalWithData, deficitCount, noDataCount } = useMemo(() => {
    const summary = categories.map((cat) => ({
      label: cat.nama,
      code: cat.code,
      icon: cat.icon,
      persen: cat.pct,
      target: targets[cat.id] ?? 80,
      hasData: cat.hasData,
      status: cat.status,
      laporanCount: cat.laporanCount,
    }));

    const chartData = summary.map((s) => ({
      name: s.label.length > 12 ? `${s.label.substring(0, 12)}...` : s.label,
      persen: s.persen,
      target: s.target,
    }));

    const achievedCount = summary.filter((s) => s.hasData && s.persen >= s.target).length;
    const totalWithData = summary.filter((s) => s.hasData).length;
    const deficitCount = totalWithData - achievedCount;
    const noDataCount = summary.length - totalWithData;

    return { summary, chartData, achievedCount, totalWithData, deficitCount, noDataCount };
  }, [categories, targets]);

  if (!pkmId) {
    return (
      <EmptyState
        icon={<AlertCircle className="w-8 h-8 opacity-40" />}
        title="Anda belum terhubung ke Puskesmas manapun."
        description="Hubungi admin untuk penugasan wilayah."
        className="min-h-[400px]"
      />
    );
  }

  if (isLoading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-2 border-[hsl(var(--muted))] border-t-[hsl(var(--accent))] animate-spin" />
        <p className="eyebrow pulse-soft">Memuat Dashboard...</p>
      </div>
    );
  }

  let statusTitle = "Data Belum Lengkap";
  let statusMsg = "Silakan lengkapi input laporan bulanan.";
  let statusAccent = "error";

  async function handleExportPDF() {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

    const doc = new jsPDF({ orientation: "portrait" });
    const pkmNama = data?.puskesmas?.nama || "Puskesmas";

    doc.setFontSize(18);
    doc.setTextColor(9, 9, 11);
    doc.text(`Dashboard ${pkmNama}`, 14, 18);

    doc.setFontSize(10);
    doc.setTextColor(113, 113, 122);
    doc.text(`Periode: ${BULAN_NAMES[bulan]} ${tahun} | Dicetak: ${new Date().toLocaleString("id-ID")}`, 14, 25);

    doc.setFontSize(11);
    doc.setTextColor(9, 9, 11);
    doc.text(`${statusTitle}`, 14, 34);
    doc.setFontSize(8);
    doc.setTextColor(113, 113, 122);
    doc.text(statusMsg, 14, 39);

    const headers = ["Kategori", "Capaian (%)", "Target (%)", "Status", "Selisih"];
    const rows = summary.map((s) => [
      `${s.icon} ${s.label}`,
      s.hasData ? `${s.persen}` : "\u2014",
      `${s.target}`,
      s.hasData ? (s.persen >= s.target ? "Tercapai" : "Defisit") : "Belum Ada",
      s.hasData ? `${s.persen >= s.target ? "+" : ""}${(s.persen - s.target).toFixed(1)}%` : "\u2014",
    ]);

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 44,
      styles: { fontSize: 9, cellPadding: 3, textColor: [9, 9, 11] },
      headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [244, 244, 245] },
      columnStyles: {
        1: { halign: "center", fontStyle: "bold" },
        2: { halign: "center" },
        3: { halign: "center" },
        4: { halign: "center", fontStyle: "bold" },
      },
    });

    doc.save(`dashboard-${pkmNama}-${bulan}-${tahun}.pdf`);
  }

  if (totalWithData === 0) {
    statusTitle = "Belum Ada Data";
    statusMsg = `Belum ada laporan yang disubmit untuk ${BULAN_NAMES[bulan]} ${tahun}.`;
    statusAccent = "neutral";
  } else if (achievedCount === totalWithData && totalWithData > 0) {
    statusTitle = "Semua Target Tercapai!";
    statusMsg = "Seluruh indikator kesehatan lingkungan memenuhi target wilayah.";
    statusAccent = "success";
  } else if (achievedCount > 0) {
    statusTitle = `${achievedCount} dari ${totalWithData} Target Tercapai`;
    statusMsg = "Fokuskan pembinaan pada indikator yang masih di bawah target.";
    statusAccent = "warning";
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 fade-in">
      {/* ── HERO ── */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0C1B16] text-white border border-[#16352B] shadow-lg">
        <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full bg-[#00A876] opacity-[0.14] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-20 w-80 h-80 rounded-full bg-[#BEF264] opacity-[0.06] blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,#153A2D_0%,transparent_60%)] pointer-events-none" />
        <div className="relative z-10 px-6 sm:px-8 py-6 sm:py-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#7CF5CE]/70 mb-2">
              {BULAN_NAMES[bulan]} {tahun} · Puskesmas
            </p>
            <h1 className="text-[26px] sm:text-[32px] font-black tracking-tight leading-none">
              {data?.puskesmas?.nama || "Puskesmas"}
            </h1>
            <p className="text-[13px] font-medium text-white/60 mt-2">
              {achievedCount}/{summary.length} indikator tercapai
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <LaporanFilter />
            {data && categories.length > 0 && (
              <button
                onClick={handleExportPDF}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[#BEF264] text-[#06281E] text-[12px] font-black hover:brightness-105 active:scale-95 transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5" /> Cetak PDF
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── BANNER STATUS ── */}
      <div
        className={`mt-6 rounded-3xl border p-6 flex flex-wrap items-center gap-6 ${
          statusAccent === "success"
            ? "bg-[#00A876]/[0.06] border-[#00A876]/25"
            : statusAccent === "warning"
              ? "bg-[#E8A33D]/[0.06] border-[#E8A33D]/25"
              : statusAccent === "neutral"
                ? "bg-[hsl(var(--muted))]/30 border-[hsl(var(--border))]"
                : "bg-[#E15A4F]/[0.05] border-[#E15A4F]/25"
        }`}
      >
        <div className="flex items-center gap-4 flex-1 min-w-[240px]">
          <span
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-white ${
              statusAccent === "success"
                ? "bg-[#00A876]"
                : statusAccent === "warning"
                  ? "bg-[#E8A33D]"
                  : statusAccent === "neutral"
                    ? "bg-[hsl(var(--muted-foreground))]"
                    : "bg-[#E15A4F]"
            }`}
          >
            {statusAccent === "success" ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : statusAccent === "warning" ? (
              <TrendingUp className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
          </span>
          <div>
            <h2 className="text-[16px] font-extrabold text-[hsl(var(--foreground))] leading-tight">{statusTitle}</h2>
            <p className="text-[12px] font-medium text-[hsl(var(--muted-foreground))] mt-1">{statusMsg}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="inline-flex flex-col items-center h-14 justify-center px-4 rounded-2xl bg-[#00A876]/10 border border-[#00A876]/20">
            <span className="text-[18px] font-black tabular-nums text-[#00A876] leading-none">
              {achievedCount}
              <span className="text-[11px] font-bold text-[#00A876]/60">/{summary.length}</span>
            </span>
            <span className="text-[8px] font-extrabold uppercase tracking-[0.15em] text-[#00A876]/70 mt-1">
              Tercapai
            </span>
          </span>
          <span className="inline-flex flex-col items-center h-14 justify-center px-4 rounded-2xl bg-[#E8A33D]/10 border border-[#E8A33D]/20">
            <span className="text-[18px] font-black tabular-nums text-[#C07F1F] leading-none">{deficitCount}</span>
            <span className="text-[8px] font-extrabold uppercase tracking-[0.15em] text-[#C07F1F]/70 mt-1">
              Defisit
            </span>
          </span>
          <span className="inline-flex flex-col items-center h-14 justify-center px-4 rounded-2xl bg-[#E15A4F]/[0.07] border border-[#E15A4F]/20">
            <span className="text-[18px] font-black tabular-nums text-[#E15A4F] leading-none">{noDataCount}</span>
            <span className="text-[8px] font-extrabold uppercase tracking-[0.15em] text-[#E15A4F]/70 mt-1">Kosong</span>
          </span>
        </div>
      </div>

      {/* ── KATEGORI + CHART ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-6">
        {/* KIRI: list kategori */}
        <div className="lg:col-span-2 space-y-2.5">
          <h3 className="text-[10px] font-extrabold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.22em] px-1 pb-1">
            Indikator Kategori
          </h3>

          {summary.length === 0 ? (
            <div className="border border-dashed border-[hsl(var(--border))] rounded-xl p-8 flex flex-col items-center justify-center text-center">
              <AlertCircle className="w-8 h-8 text-[hsl(var(--muted-foreground))]/40 mb-3" />
              <p className="text-[13px] font-bold text-[hsl(var(--foreground))]">Belum Ada Kategori</p>
              <p className="text-[12px] text-[hsl(var(--muted-foreground))] mt-1">Laporan belum tersedia.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {summary.map((s) => {
                const isMet = s.hasData && s.persen >= s.target;
                const rail = !s.hasData ? "#d6d3d1" : isMet ? "#00A876" : "#E8A33D";
                const valColor = !s.hasData
                  ? "text-[hsl(var(--muted-foreground))]"
                  : isMet
                    ? "text-[#00A876]"
                    : "text-[#C07F1F]";
                return (
                  <a
                    key={s.code}
                    href={`/laporan/${s.code}?bulan=${bulan}&tahun=${tahun}`}
                    className="group flex items-stretch rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[#00A876]/40 transition-colors overflow-hidden"
                  >
                    <div className="w-1 shrink-0" style={{ background: rail }} />
                    <div className="flex-1 flex items-center gap-4 px-5 py-4">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-[18px] shrink-0 ${
                          !s.hasData ? "bg-[hsl(var(--muted))]" : isMet ? "bg-[#00A876]/10" : "bg-[#E8A33D]/10"
                        }`}
                      >
                        {s.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[13px] font-extrabold text-[hsl(var(--foreground))] truncate">{s.label}</h4>
                        <p className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] mt-0.5">
                          {s.hasData ? `${s.laporanCount} laporan` : "Belum ada laporan"}
                        </p>
                      </div>
                      <div className="flex-1 hidden sm:block">
                        {s.hasData ? (
                          <ComplianceBar value={s.persen} target={s.target} label="" size="sm" compact />
                        ) : (
                          <div className="flex-1 h-1.5 rounded-full bg-[hsl(var(--muted))]/60" />
                        )}
                      </div>
                      <div className="shrink-0 text-right w-24 flex items-center justify-end gap-2">
                        <div className="flex flex-col items-end">
                          <span className={`text-[18px] font-black tabular-nums leading-none ${valColor}`}>
                            {s.hasData ? `${s.persen.toFixed(1)}%` : "—"}
                          </span>
                          <span className="text-[8px] font-extrabold text-[hsl(var(--muted-foreground))] tracking-[0.15em] mt-1">
                            TGT {s.target}%
                          </span>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-[#00A876] opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* ── KANAN: CHART OVERVIEW ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-[14px] font-bold text-[hsl(var(--foreground))] uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-[hsl(var(--muted-foreground))]/40 rounded-full"></span> Statistik Utama
            </h3>
          </div>

          <div className="bg-[hsl(var(--muted))]/10 border border-[hsl(var(--border))]/40 rounded-2xl p-6">
            <div className="flex gap-4 mb-6 text-[10px] font-extrabold uppercase tracking-widest justify-center">
              <span className="flex items-center gap-1.5 text-[hsl(var(--accent))]">
                <span className="w-2 h-2 rounded-full bg-[hsl(var(--accent))]" /> Capaian
              </span>
              <span className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))]">
                <span className="w-2 h-2 rounded-full bg-[hsl(var(--muted))]" /> Target
              </span>
            </div>

            <div className="h-[300px] w-full min-w-[200px] min-h-[300px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} opacity={0.5} />
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      fontSize={10}
                      width={80}
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted)/0.2)" }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const capaian = payload[0]?.value as number;
                        const targetVal = (payload[1]?.value as number) ?? 80;
                        return (
                          <div className="bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg shadow-xl p-3">
                            <p className="text-[11px] font-bold uppercase tracking-widest mb-2 pb-2 border-b border-[hsl(var(--border))]/50">
                              {payload[0]?.payload?.name}
                            </p>
                            <div className="space-y-1 text-[12px] font-medium">
                              <div className="flex justify-between gap-6">
                                <span className="text-[hsl(var(--muted-foreground))]">Capaian</span>
                                <span className="font-bold text-[hsl(var(--accent))]">{capaian}%</span>
                              </div>
                              <div className="flex justify-between gap-6">
                                <span className="text-[hsl(var(--muted-foreground))]">Target</span>
                                <span className="font-bold">{targetVal}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="persen" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} barSize={12} />
                    <Bar dataKey="target" fill="hsl(var(--muted))" radius={[0, 4, 4, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[12px] font-medium text-[hsl(var(--muted-foreground))]">
                  Tidak ada data untuk grafik
                </div>
              )}
            </div>

            {/* Quick Tips */}
            <div className="mt-6 pt-5 border-t border-[hsl(var(--border))]/40">
              <div className="flex gap-3 text-[12px] text-[hsl(var(--muted-foreground))] leading-relaxed">
                <Info className="w-4 h-4 shrink-0 text-[hsl(var(--accent))] mt-0.5" />
                <p>Klik pada kategori di daftar sebelah kiri untuk mengisi atau memperbaiki data laporan bulan ini.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
