"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Download,
  TrendingUp,
  Info,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LaporanFilter } from "@/components/laporan-filter";
import { ComplianceBar } from "@/components/ui/compliance-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useLaporanFilter } from "@/hooks/use-laporan-filter";
import { cn } from "@/lib/utils";

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

  let statusClass = "bg-[hsl(var(--error)/0.06)] text-[hsl(var(--error))] border-[hsl(var(--error)/0.15)]";
  let statusIcon = <AlertCircle className="w-5 h-5 text-[hsl(var(--error))] stroke-[2]" />;
  let statusTitle = "Data Belum Lengkap";
  let statusMsg = "Silakan lengkapi input laporan bulanan.";
  let statusAccent = "error";
  let statusShell = "card-shell";

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
    statusClass = "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))]";
    statusIcon = <AlertCircle className="w-5 h-5 text-[hsl(var(--muted-foreground))] opacity-40" />;
    statusTitle = "Belum Ada Data";
    statusMsg = `Belum ada laporan yang disubmit untuk ${BULAN_NAMES[bulan]} ${tahun}.`;
    statusAccent = "neutral";
    statusShell = "card-flat";
  } else if (achievedCount === totalWithData && totalWithData > 0) {
    statusClass = "bg-[hsl(var(--accent-light))] text-[hsl(var(--accent))] border-[hsl(var(--accent)/0.15)]";
    statusIcon = <CheckCircle2 className="w-5 h-5 text-[hsl(var(--accent))] stroke-[2]" />;
    statusTitle = "Semua Target Tercapai!";
    statusMsg = "Seluruh indikator kesehatan lingkungan memenuhi target wilayah.";
    statusAccent = "success";
    statusShell = "card-accent";
  } else if (achievedCount > 0) {
    statusClass = "bg-[hsl(var(--warning)/0.06)] text-[hsl(var(--warning))] border-[hsl(var(--warning)/0.15)]";
    statusIcon = <TrendingUp className="w-5 h-5 text-[hsl(var(--warning))] stroke-[2]" />;
    statusTitle = `${achievedCount} dari ${totalWithData} Target Tercapai`;
    statusMsg = "Fokuskan pembinaan pada indikator yang masih di bawah target.";
    statusAccent = "warning";
    statusShell = "card-shell";
  }

  const getStatusBadge = (status: string | null, hasData: boolean) => {
    if (!hasData) return <span className="stat-label">Belum Ada</span>;
    return <StatusBadge status={status || "DRAFT"} />;
  };

  return (
    <div className="w-full mx-auto pb-10 space-y-8 fade-in">
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] md:text-[32px] font-extrabold tracking-tight text-[hsl(var(--foreground))] flex items-center gap-3">
            <Building2 className="w-7 h-7 text-[hsl(var(--accent))] p-1 bg-[hsl(var(--accent))]/10 rounded-md" />
            Dashboard {data?.puskesmas?.nama || "Puskesmas"}
          </h1>
          <p className="text-[13px] font-medium text-[hsl(var(--muted-foreground))] mt-1 flex items-center gap-2">
            Periode:{" "}
            <span className="text-[hsl(var(--foreground))] font-bold">
              {BULAN_NAMES[bulan]} {tahun}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LaporanFilter />
          {data && categories.length > 0 && (
            <button
              onClick={handleExportPDF}
              className="h-9 px-4 rounded-full flex items-center gap-1.5 border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--foreground))] hover:bg-[hsl(var(--foreground))] hover:text-[hsl(var(--background))] hover:border-[hsl(var(--foreground))] transition-all shadow-sm"
            >
              <Download className="w-3 h-3" /> Cetak PDF
            </button>
          )}
        </div>
      </div>

      {/* ── BANNER STATUS & METRIK ── */}
      <div
        className={`relative overflow-hidden rounded-2xl p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center justify-between border ${
          statusAccent === "success"
            ? "bg-[hsl(var(--accent))]/10 border-[hsl(var(--accent))]/20"
            : statusAccent === "warning"
              ? "bg-[hsl(var(--warning))]/10 border-[hsl(var(--warning))]/20"
              : "bg-[hsl(var(--error))]/10 border-[hsl(var(--error))]/20"
        }`}
      >
        <div className="flex-1 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                statusAccent === "success"
                  ? "bg-[hsl(var(--accent))] text-white shadow-[0_0_15px_hsl(var(--accent)/0.3)]"
                  : statusAccent === "warning"
                    ? "bg-[hsl(var(--warning))] text-white shadow-[0_0_15px_hsl(var(--warning)/0.3)]"
                    : "bg-[hsl(var(--error))] text-white shadow-[0_0_15px_hsl(var(--error)/0.3)]"
              }`}
            >
              {statusAccent === "success" ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : statusAccent === "warning" ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
            </div>
            <h2 className="text-[20px] font-bold text-[hsl(var(--foreground))] tracking-tight">{statusTitle}</h2>
          </div>
          <p className="text-[14px] font-medium text-[hsl(var(--muted-foreground))] max-w-lg">{statusMsg}</p>
        </div>

        <div className="flex items-center gap-6 md:gap-10 shrink-0 w-full md:w-auto">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-widest">
              Tercapai
            </span>
            <span className="text-[36px] font-extrabold text-[hsl(var(--foreground))] leading-none tabular-nums flex items-baseline gap-1">
              {achievedCount}
              <span className="text-[14px] font-medium text-[hsl(var(--muted-foreground))]">/ {summary.length}</span>
            </span>
          </div>
          <div className="w-px h-12 bg-[hsl(var(--border))]/50"></div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-widest">
              Defisit
            </span>
            <span
              className={`text-[36px] font-extrabold leading-none tabular-nums flex items-baseline gap-1 ${deficitCount > 0 ? "text-[hsl(var(--warning))]" : "text-[hsl(var(--foreground))]"}`}
            >
              {deficitCount}
            </span>
          </div>
          <div className="w-px h-12 bg-[hsl(var(--border))]/50 hidden sm:block"></div>
          <div className="flex flex-col gap-1 hidden sm:flex">
            <span className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-widest">
              Kosong
            </span>
            <span
              className={`text-[36px] font-extrabold leading-none tabular-nums flex items-baseline gap-1 ${noDataCount > 0 ? "text-[hsl(var(--error))]" : "text-[hsl(var(--foreground))]"}`}
            >
              {noDataCount}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
        {/* ── KIRI: LIST KATEGORI ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-[14px] font-bold text-[hsl(var(--foreground))] uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-[hsl(var(--accent))] rounded-full"></span> Capaian Indikator
            </h3>
          </div>

          {summary.length === 0 ? (
            <div className="border border-dashed border-[hsl(var(--border))] rounded-xl p-8 flex flex-col items-center justify-center text-center">
              <AlertCircle className="w-8 h-8 text-[hsl(var(--muted-foreground))]/40 mb-3" />
              <p className="text-[13px] font-bold text-[hsl(var(--foreground))]">Belum Ada Kategori</p>
              <p className="text-[12px] text-[hsl(var(--muted-foreground))] mt-1">Laporan belum tersedia.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {summary.map((s) => {
                const isMet = s.hasData && s.persen >= s.target;
                return (
                  <a
                    key={s.code}
                    href={`/laporan/${s.code}?bulan=${bulan}&tahun=${tahun}`}
                    className={`group block p-4 rounded-xl border transition-all duration-300 ${
                      !s.hasData
                        ? "bg-[hsl(var(--background))] border-[hsl(var(--border))]/40 hover:border-[hsl(var(--border))] hover:shadow-sm"
                        : isMet
                          ? "bg-[hsl(var(--accent))]/5 border-[hsl(var(--accent))]/20 hover:border-[hsl(var(--accent))]/40 hover:shadow-[0_4px_20px_hsl(var(--accent)/0.1)]"
                          : "bg-[hsl(var(--warning))]/5 border-[hsl(var(--warning))]/20 hover:border-[hsl(var(--warning))]/40 hover:shadow-[0_4px_20px_hsl(var(--warning)/0.1)]"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* Icon & Label */}
                      <div className="flex items-center gap-4 w-full sm:w-1/3 shrink-0">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-[18px] ${
                            !s.hasData
                              ? "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                              : isMet
                                ? "bg-[hsl(var(--accent))]/20 text-[hsl(var(--accent))]"
                                : "bg-[hsl(var(--warning))]/20 text-[hsl(var(--warning))]"
                          }`}
                        >
                          {s.icon}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-[14px] font-bold text-[hsl(var(--foreground))] truncate group-hover:text-[hsl(var(--accent))] transition-colors">
                            {s.label}
                          </h4>
                          {s.hasData ? (
                            <p className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] mt-0.5">
                              {s.laporanCount} baris data
                            </p>
                          ) : (
                            <p className="text-[11px] font-bold text-[hsl(var(--error))]/80 mt-0.5">Kosong</p>
                          )}
                        </div>
                      </div>

                      {/* Bar */}
                      <div className="flex-1 w-full flex items-center gap-4">
                        {s.hasData ? (
                          <div className="flex-1">
                            <ComplianceBar value={s.persen} target={s.target} label="" size="sm" compact />
                          </div>
                        ) : (
                          <div className="flex-1 h-1.5 rounded-full bg-[hsl(var(--muted))]/50"></div>
                        )}

                        {/* Stats */}
                        <div className="flex items-center gap-4 shrink-0 text-right w-24 justify-end">
                          <div className="flex flex-col">
                            <span
                              className={`text-[15px] font-black tabular-nums leading-none ${
                                !s.hasData
                                  ? "text-[hsl(var(--muted-foreground))]"
                                  : isMet
                                    ? "text-[hsl(var(--accent))]"
                                    : "text-[hsl(var(--warning))]"
                              }`}
                            >
                              {s.hasData ? `${s.persen.toFixed(1)}%` : "—"}
                            </span>
                            <span className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-widest mt-1">
                              TGT: {s.target}%
                            </span>
                          </div>
                          <ArrowUpRight
                            className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1 group-hover:-translate-y-1 ${
                              isMet ? "text-[hsl(var(--accent))]" : "text-[hsl(var(--warning))]"
                            }`}
                          />
                        </div>
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
                        const diff = capaian - targetVal;
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
