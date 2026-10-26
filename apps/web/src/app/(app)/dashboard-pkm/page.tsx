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
        <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
        <p className="eyebrow pulse-soft text-muted-foreground">Memuat Dashboard...</p>
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
      headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: "bold" },
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
    <div className="w-full fade-in min-h-screen bg-canvas">
      {/* ── MASTHEAD FLUSH LANGSUNG KE NAVBAR ── */}
      <div className="w-full bg-surface border-b border-border px-6 sm:px-8 py-5 sm:py-6">
        <div className="w-full max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-primary mb-1.5 sm:mb-2">
              {BULAN_NAMES[bulan]} {tahun} · Puskesmas
            </p>
            <h1 className="text-[22px] sm:text-[28px] font-black tracking-tight leading-none text-foreground">
              {data?.puskesmas?.nama || "Puskesmas"}
            </h1>
            <p className="text-[12px] sm:text-[13px] font-medium text-muted-foreground mt-2">
              <span className="tabular-nums font-bold text-foreground">{achievedCount}</span>/
              <span className="tabular-nums font-bold">{summary.length}</span> indikator tercapai
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <LaporanFilter />
            {data && categories.length > 0 && (
              <button
                onClick={handleExportPDF}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-primary text-white text-[12px] font-black hover:bg-primary-hover active:scale-95 transition shadow-xs"
              >
                <Download className="w-3.5 h-3.5" /> Cetak PDF
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── CONTENT BODY (CANVAS) ── */}
      <div className="w-full max-w-[1600px] mx-auto px-6 sm:px-8 py-6 space-y-6">
        {/* ── BANNER STATUS ── */}
        <div
          className={`rounded-card border p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 sm:gap-6 shadow-subtle ${
            statusAccent === "success"
              ? "bg-primary-subtle/50 border-primary/20"
              : statusAccent === "warning"
                ? "bg-amber-500/[0.06] border-amber-500/25"
                : statusAccent === "neutral"
                  ? "bg-surface border-border"
                  : "bg-rose-500/[0.05] border-rose-500/25"
          }`}
        >
          <div className="flex items-center gap-4 flex-1 min-w-[240px]">
            <span
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-white shadow-subtle ${
                statusAccent === "success"
                  ? "bg-primary"
                  : statusAccent === "warning"
                    ? "bg-amber-500"
                    : statusAccent === "neutral"
                      ? "bg-muted-foreground"
                      : "bg-rose-500"
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
              <h2 className="text-[16px] font-extrabold text-foreground leading-tight">{statusTitle}</h2>
              <p className="text-[12px] font-medium text-muted-foreground mt-1">{statusMsg}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <span className="inline-flex flex-col items-center h-14 justify-center px-4 rounded-card bg-primary-subtle border border-primary/20 shadow-subtle">
              <span className="text-[18px] font-black tabular-nums text-primary leading-none">
                {achievedCount}
                <span className="text-[11px] font-bold text-primary/60">/{summary.length}</span>
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-primary/80 mt-1">
                Tercapai
              </span>
            </span>
            <span className="inline-flex flex-col items-center h-14 justify-center px-4 rounded-card bg-amber-500/10 border border-amber-500/20 shadow-subtle">
              <span className="text-[18px] font-black tabular-nums text-amber-600 leading-none">{deficitCount}</span>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-amber-600/80 mt-1">
                Defisit
              </span>
            </span>
            <span className="inline-flex flex-col items-center h-14 justify-center px-4 rounded-card bg-rose-500/10 border border-rose-500/20 shadow-subtle">
              <span className="text-[18px] font-black tabular-nums text-rose-600 leading-none">{noDataCount}</span>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-rose-600/80 mt-1">
                Kosong
              </span>
            </span>
          </div>
        </div>

        {/* ── KATEGORI + CHART ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          {/* KIRI: list kategori */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-[0.22em] px-1 pb-1">
              Indikator Kategori
            </h3>

            {summary.length === 0 ? (
              <div className="rounded-card bg-surface border border-dashed border-border shadow-subtle p-8 flex flex-col items-center justify-center text-center">
                <AlertCircle className="w-8 h-8 text-muted-foreground/40 mb-3" />
                <p className="text-[13px] font-bold text-foreground">Belum Ada Kategori</p>
                <p className="text-[12px] text-muted-foreground mt-1">Laporan belum tersedia.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {summary.map((s) => {
                  const isMet = s.hasData && s.persen >= s.target;
                  const rail = !s.hasData ? "bg-muted-foreground/30" : isMet ? "bg-primary" : "bg-amber-500";
                  const valColor = !s.hasData ? "text-muted-foreground" : isMet ? "text-primary" : "text-amber-600";
                  return (
                    <a
                      key={s.code}
                      href={`/laporan/${s.code}?bulan=${bulan}&tahun=${tahun}`}
                      className="group flex items-stretch rounded-card bg-surface border border-border shadow-subtle hover:border-primary/40 hover:shadow-md transition-all overflow-hidden"
                    >
                      <div className={`w-1.5 shrink-0 ${rail}`} />
                      <div className="flex-1 flex items-center gap-4 px-5 py-4">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-[18px] shrink-0 ${
                            !s.hasData
                              ? "bg-surface-subtle text-muted-foreground"
                              : isMet
                                ? "bg-primary-subtle text-primary"
                                : "bg-amber-500/10 text-amber-600"
                          }`}
                        >
                          {s.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[13px] font-extrabold text-foreground truncate group-hover:text-primary transition-colors">
                            {s.label}
                          </h4>
                          <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">
                            {s.hasData ? (
                              <>
                                <span className="tabular-nums">{s.laporanCount}</span> laporan
                              </>
                            ) : (
                              "Belum ada laporan"
                            )}
                          </p>
                        </div>
                        <div className="flex-1 hidden sm:block">
                          {s.hasData ? (
                            <ComplianceBar value={s.persen} target={s.target} label="" size="sm" compact />
                          ) : (
                            <div className="flex-1 h-1.5 rounded-full bg-border" />
                          )}
                        </div>
                        <div className="shrink-0 text-right w-24 flex items-center justify-end gap-2">
                          <div className="flex flex-col items-end">
                            <span className={`text-[18px] font-black tabular-nums leading-none ${valColor}`}>
                              {s.hasData ? `${s.persen.toFixed(1)}%` : "—"}
                            </span>
                            <span className="text-[10px] font-extrabold text-muted-foreground tracking-[0.15em] mt-1 tabular-nums">
                              TGT {s.target}%
                            </span>
                          </div>
                          <ArrowUpRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── KANAN: CHART OVERVIEW ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1">
              <h3 className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-[0.22em] flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full" /> Statistik Utama
              </h3>
            </div>

            <div className="rounded-card bg-surface border border-border shadow-subtle p-6">
              <div className="flex gap-4 mb-6 text-[10px] font-extrabold uppercase tracking-widest justify-center">
                <span className="flex items-center gap-1.5 text-primary">
                  <span className="w-2 h-2 rounded-full bg-primary" /> Capaian
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-border" /> Target
                </span>
              </div>

              <div className="h-[300px] w-full min-w-[200px] min-h-[300px]">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} layout="vertical">
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--color-border)"
                        horizontal={false}
                        opacity={0.5}
                      />
                      <XAxis type="number" domain={[0, 100]} hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        axisLine={false}
                        tickLine={false}
                        fontSize={10}
                        width={80}
                        tick={{ fill: "var(--color-text-muted)" }}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const capaian = payload[0]?.value as number;
                          const targetVal = (payload[1]?.value as number) ?? 80;
                          return (
                            <div className="rounded-card bg-surface border border-border shadow-float p-3">
                              <p className="text-[11px] font-bold uppercase tracking-widest mb-2 pb-2 border-b border-border text-foreground">
                                {payload[0]?.payload?.name}
                              </p>
                              <div className="space-y-1 text-[12px] font-medium">
                                <div className="flex justify-between gap-6">
                                  <span className="text-muted-foreground">Capaian</span>
                                  <span className="font-bold text-primary tabular-nums">{capaian}%</span>
                                </div>
                                <div className="flex justify-between gap-6">
                                  <span className="text-muted-foreground">Target</span>
                                  <span className="font-bold text-foreground tabular-nums">{targetVal}%</span>
                                </div>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="persen" fill="var(--color-primary)" radius={[0, 4, 4, 0]} barSize={12} />
                      <Bar dataKey="target" fill="var(--color-border)" radius={[0, 4, 4, 0]} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-[12px] font-medium text-muted-foreground">
                    Tidak ada data untuk grafik
                  </div>
                )}
              </div>

              {/* Quick Tips */}
              <div className="mt-6 pt-5 border-t border-border">
                <div className="flex gap-3 text-[12px] text-muted-foreground leading-relaxed">
                  <Info className="w-4 h-4 shrink-0 text-primary mt-0.5" />
                  <p>
                    Klik pada kategori di daftar sebelah kiri untuk mengisi atau memperbaiki data laporan bulan ini.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
