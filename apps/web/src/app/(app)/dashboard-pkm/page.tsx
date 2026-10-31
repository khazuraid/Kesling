"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Layers,
  ListChecks,
  Search,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { LaporanFilter } from "@/components/laporan-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { NumberFlow } from "@/components/ui/number-flow";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
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

interface LaporanParameter {
  id: number;
  nama: string;
  code: string;
  tipe: string;
  urutan: number;
}

interface LaporanSubCategory {
  id: number;
  nama: string;
  urutan: number;
}

interface LaporanValue {
  id: string;
  value: string;
  parameterId: number;
  subCategoryId: number | null;
  parameter: LaporanParameter;
  subCategory?: LaporanSubCategory | null;
}

interface DynamicLaporanRecord {
  id: string;
  categoryId: number;
  category: {
    nama: string;
    code: string;
    icon: string;
    isRowBased: boolean;
  };
  status: string;
  createdAt: string;
  updatedAt: string;
  values: LaporanValue[];
}

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
  puskesmas: { id: number; nama: string; kode?: string } | null;
  categories: CategoryScore[];
  targets: Record<string, number>;
  laporan?: DynamicLaporanRecord[];
}

export default function DashboardPkmPage() {
  const { data: session } = useSession();
  const { bulan, tahun } = useLaporanFilter();
  const pkmId = (session?.user as any)?.puskesmasId;

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACHIEVED" | "DEFICIT" | "EMPTY">("ALL");
  const [activeTab, setActiveTab] = useState("matriks");
  const [selectedCategoryCode, setSelectedCategoryCode] = useState<string>("");

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard-pkm", pkmId, bulan, tahun],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/puskesmas?puskesmasId=${pkmId}&bulan=${bulan}&tahun=${tahun}`);
      if (!res.ok) throw new Error("Gagal memuat dashboard analitik");
      return res.json();
    },
    enabled: !!pkmId,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const categories = data?.categories || [];
  const targets = data?.targets || {};
  const allLaporan = data?.laporan || [];

  // ── KALKULASI ANALITIK KOMPREHENSIF ──
  const analytics = useMemo(() => {
    let totalNum = 0;
    let totalDen = 0;
    let achievedCount = 0;
    let deficitCount = 0;
    let emptyCount = 0;
    let sumPct = 0;
    let sumTarget = 0;
    let approvedLaporan = 0;
    let submittedLaporan = 0;
    let draftLaporan = 0;

    const list = categories.map((cat) => {
      const targetVal = targets[cat.id] ?? 80;
      const gap = cat.hasData ? Number((cat.pct - targetVal).toFixed(1)) : 0;
      const isAchieved = cat.hasData && cat.pct >= targetVal;
      const isDeficit = cat.hasData && cat.pct < targetVal;

      if (cat.hasData) {
        totalNum += cat.num || 0;
        totalDen += cat.den || 0;
        sumPct += cat.pct;
        sumTarget += targetVal;
        if (isAchieved) achievedCount++;
        if (isDeficit) deficitCount++;
      } else {
        emptyCount++;
      }

      // Hitung status verifikasi
      if (cat.status === "APPROVED") approvedLaporan++;
      else if (cat.status === "SUBMITTED") submittedLaporan++;
      else draftLaporan++;

      return {
        ...cat,
        target: targetVal,
        gap,
        isAchieved,
        isDeficit,
        // Sasaran belum memenuhi syarat
        nonCompliant: Math.max(0, cat.den - cat.num),
      };
    });

    const categoriesWithData = list.filter((c) => c.hasData);
    const avgCompliance = categoriesWithData.length > 0 ? Number((sumPct / categoriesWithData.length).toFixed(1)) : 0;
    const avgTarget = categoriesWithData.length > 0 ? Number((sumTarget / categoriesWithData.length).toFixed(1)) : 80;
    const overallRatio = totalDen > 0 ? Number(((totalNum / totalDen) * 100).toFixed(1)) : 0;

    // Chart Komparasi Capaian vs Target
    const comparativeChartData = list.map((c) => ({
      name: c.nama.length > 14 ? `${c.nama.substring(0, 14)}...` : c.nama,
      fullName: c.nama,
      code: c.code,
      capaian: c.hasData ? c.pct : 0,
      target: c.target,
      hasData: c.hasData,
      status: c.isAchieved ? "Tercapai" : c.hasData ? "Defisit" : "Kosong",
    }));

    // Chart Volume Riil (Memenuhi vs Belum Memenuhi Syarat)
    const volumeChartData = list
      .filter((c) => c.hasData && c.den > 0)
      .map((c) => ({
        name: c.nama.length > 12 ? `${c.nama.substring(0, 12)}...` : c.nama,
        fullName: c.nama,
        memenuhi: c.num,
        belumMemenuhi: c.nonCompliant,
        total: c.den,
        persen: c.pct,
      }));

    // Urutan prioritas defisit (terbesar ke terkecil)
    const deficitPriority = [...list].filter((c) => c.hasData && c.isDeficit).sort((a, b) => a.gap - b.gap);

    // Urutan performa terbaik
    const topPerformers = [...list].filter((c) => c.hasData && c.isAchieved).sort((a, b) => b.gap - a.gap);

    return {
      list,
      totalNum,
      totalDen,
      achievedCount,
      deficitCount,
      emptyCount,
      avgCompliance,
      avgTarget,
      overallRatio,
      approvedLaporan,
      submittedLaporan,
      draftLaporan,
      comparativeChartData,
      volumeChartData,
      deficitPriority,
      topPerformers,
    };
  }, [categories, targets]);

  // Set default selected category for drilldown
  const activeCategoryCode = selectedCategoryCode || categories[0]?.code || "";

  // Data isian spesifik untuk kategori yang dipilih
  const selectedLaporan = useMemo(() => {
    return allLaporan.filter((l) => l.category.code === activeCategoryCode);
  }, [allLaporan, activeCategoryCode]);

  // Filtered indicators list for the matrix table
  const filteredCategories = useMemo(() => {
    return analytics.list.filter((c) => {
      const matchSearch =
        c.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;

      if (statusFilter === "ACHIEVED") return c.isAchieved;
      if (statusFilter === "DEFICIT") return c.isDeficit;
      if (statusFilter === "EMPTY") return !c.hasData;
      return true;
    });
  }, [analytics.list, searchQuery, statusFilter]);

  // ── EXPORT ENGINE (PDF & CSV) ──
  async function handleExportPDF() {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

    const doc = new jsPDF({ orientation: "portrait" });
    const pkmNama = data?.puskesmas?.nama || "Puskesmas";

    // Header Laporan
    doc.setFontSize(16);
    doc.setTextColor(5, 150, 105);
    doc.text(`LAPORAN ANALITIK KESEHATAN LINGKUNGAN`, 14, 16);

    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text(pkmNama, 14, 23);

    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(`Periode: ${BULAN_NAMES[bulan]} ${tahun}  |  Dicetak: ${new Date().toLocaleString("id-ID")}`, 14, 29);

    // Ringkasan Eksekutif
    doc.setDrawColor(229, 231, 235);
    doc.line(14, 33, 196, 33);

    doc.setFontSize(10);
    doc.setTextColor(17, 24, 39);
    doc.text(
      `Indeks Kepatuhan: ${analytics.avgCompliance}% (Target Rata-rata: ${analytics.avgTarget}%)  |  Total Sasaran Diperiksa: ${analytics.totalDen}  |  Memenuhi Syarat: ${analytics.totalNum}`,
      14,
      39,
    );
    doc.text(
      `Indikator Tercapai: ${analytics.achievedCount}/${analytics.list.length}  |  Defisit: ${analytics.deficitCount}  |  Belum Ada Data: ${analytics.emptyCount}`,
      14,
      45,
    );

    // Tabel Matriks Capaian Riil
    const headers = [
      "No",
      "Kategori Program",
      "Diperiksa (Den)",
      "Memenuhi (Num)",
      "Capaian (%)",
      "Target (%)",
      "Gap (%)",
      "Status Kinerja",
    ];

    const rows = analytics.list.map((c, idx) => [
      idx + 1,
      `${c.icon} ${c.nama}`,
      c.hasData ? c.den : "—",
      c.hasData ? c.num : "—",
      c.hasData ? `${c.pct}%` : "—",
      `${c.target}%`,
      c.hasData ? `${c.gap > 0 ? "+" : ""}${c.gap}%` : "—",
      c.hasData ? (c.isAchieved ? "Tercapai" : "Defisit") : "Belum Ada Data",
    ]);

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 52,
      styles: { fontSize: 8, cellPadding: 2.5, textColor: [17, 24, 39] },
      headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        2: { halign: "center" },
        3: { halign: "center" },
        4: { halign: "center", fontStyle: "bold" },
        5: { halign: "center" },
        6: { halign: "center", fontStyle: "bold" },
        7: { halign: "center" },
      },
    });

    doc.save(`analitik-kesling-${pkmNama.toLowerCase().replace(/\s+/g, "-")}-${bulan}-${tahun}.pdf`);
  }

  function handleExportCSV() {
    const pkmNama = data?.puskesmas?.nama || "Puskesmas";
    const csvHeader = [
      "Kode Kategori",
      "Nama Kategori",
      "Sasaran Diperiksa (Denominator)",
      "Memenuhi Syarat (Numerator)",
      "Capaian (%)",
      "Target (%)",
      "Gap Deviasi (%)",
      "Status Capaian",
      "Status Verifikasi",
    ].join(",");

    const csvRows = analytics.list.map((c) => {
      return [
        `"${c.code}"`,
        `"${c.nama}"`,
        c.hasData ? c.den : 0,
        c.hasData ? c.num : 0,
        c.hasData ? c.pct : 0,
        c.target,
        c.hasData ? c.gap : 0,
        `"${c.hasData ? (c.isAchieved ? "Tercapai" : "Defisit") : "Belum Ada Data"}"`,
        `"${c.status || "DRAFT"}"`,
      ].join(",");
    });

    const csvContent = `data:text/csv;charset=utf-8,${[csvHeader, ...csvRows].join("\n")}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `analitik-kesling-${pkmNama}-${bulan}-${tahun}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (!pkmId) {
    return (
      <EmptyState
        icon={<AlertCircle className="w-8 h-8 opacity-40 text-amber-500" />}
        title="Puskesmas Belum Terhubung"
        description="Akun Anda belum memiliki penugasan Puskesmas. Silakan hubungi Administrator Dinas Kesehatan."
        className="min-h-[400px]"
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-3 border-border border-t-primary rounded-full animate-spin" />
        <p className="text-[12px] font-bold tracking-widest uppercase text-muted-foreground animate-pulse">
          Memuat Engine Analitik Puskesmas...
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="w-full fade-in min-h-screen bg-canvas pb-16">
        {/* ── MASTHEAD & FILTER COMMAND BAR ── */}
        <div className="w-full bg-surface border-b border-border sticky top-0 z-20 shadow-xs">
          <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 py-3.5 sm:py-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    variant="outline"
                    className="text-[10px] font-extrabold uppercase tracking-widest text-primary border-primary/25 bg-primary/5"
                  >
                    Command Center Analitik
                  </Badge>
                  <span className="text-[11px] font-medium text-muted-foreground">•</span>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Periode {BULAN_NAMES[bulan]} {tahun}
                  </span>
                </div>
                <h1 className="text-[20px] sm:text-[26px] font-black tracking-tight text-foreground flex items-center gap-2.5">
                  <span>{data?.puskesmas?.nama || "Puskesmas Wilayah"}</span>
                  <Badge variant="secondary" className="text-[11px] font-bold py-0.5">
                    {analytics.list.length} Program
                  </Badge>
                </h1>
                <p className="text-[11px] sm:text-[12px] font-medium text-muted-foreground mt-0.5">
                  Evaluasi analitik terpadu berbasis data riil inspeksi kesehatan lingkungan & pembinaan sanitasi.
                </p>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                <LaporanFilter />
                <Button
                  onClick={handleExportPDF}
                  variant="outline"
                  size="sm"
                  className="rounded-full shadow-xs gap-1.5 text-[11px] font-bold h-9 sm:h-10 px-3.5 border-border hover:bg-surface-subtle"
                >
                  <Download className="w-3.5 h-3.5 text-primary" />
                  <span className="hidden sm:inline">Cetak</span> PDF
                </Button>
                <Button
                  onClick={handleExportCSV}
                  variant="outline"
                  size="sm"
                  className="rounded-full shadow-xs gap-1.5 text-[11px] font-bold h-9 sm:h-10 px-3.5 border-border hover:bg-surface-subtle"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Ekspor</span> CSV
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="rounded-full shadow-xs gap-1.5 text-[11px] font-bold h-9 sm:h-10 px-4 bg-primary text-white hover:bg-primary/90"
                >
                  <Link href={`/laporan?bulan=${bulan}&tahun=${tahun}`}>
                    <FileText className="w-3.5 h-3.5" />
                    Input Laporan
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ── CANVAS UTAMA ── */}
        <div className="w-full max-w-[1600px] mx-auto px-3.5 sm:px-8 py-5 sm:py-7 space-y-6">
          {/* ── 4 KPI CARDS ANALITIK BERBASIS ISIAN RIIL ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {/* KPI 1: Indeks Kepatuhan Rata-rata */}
            <Card className="rounded-card border border-border shadow-subtle hover:border-primary/40 transition-all">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                    Indeks Kepatuhan Rata-Rata
                  </span>
                  <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </span>
                </div>
                <CardTitle className="text-[24px] sm:text-[28px] font-black tracking-tight text-foreground flex items-baseline gap-1 mt-1">
                  <NumberFlow value={analytics.avgCompliance} />
                  <span className="text-[14px] font-bold text-muted-foreground">%</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-2">
                <Progress value={Math.min(100, analytics.avgCompliance)} className="h-1.5" />
                <div className="flex items-center justify-between text-[11px] font-semibold">
                  <span className="text-muted-foreground">Target Rata-Rata: {analytics.avgTarget}%</span>
                  <span
                    className={`inline-flex items-center gap-0.5 font-bold ${
                      analytics.avgCompliance >= analytics.avgTarget ? "text-primary" : "text-amber-600"
                    }`}
                  >
                    {analytics.avgCompliance >= analytics.avgTarget ? (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    )}
                    {(analytics.avgCompliance - analytics.avgTarget).toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* KPI 2: Total Sasaran Diperiksa (Denominator Riil) */}
            <Card className="rounded-card border border-border shadow-subtle hover:border-primary/40 transition-all">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                    Total Sasaran Diperiksa (Den)
                  </span>
                  <span className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </span>
                </div>
                <CardTitle className="text-[24px] sm:text-[28px] font-black tracking-tight text-foreground flex items-baseline gap-1 mt-1">
                  <NumberFlow value={analytics.totalDen} />
                  <span className="text-[12px] font-bold text-muted-foreground">sarana</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-1">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Akumulasi denominator dari seluruh isian inspeksi kesehatan lingkungan bulan ini.
                </p>
                <div className="text-[11px] font-bold text-foreground pt-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span>{analytics.list.filter((c) => c.hasData).length} program aktif terlapor</span>
                </div>
              </CardContent>
            </Card>

            {/* KPI 3: Memenuhi Syarat Higienis (Numerator Riil) */}
            <Card className="rounded-card border border-border shadow-subtle hover:border-primary/40 transition-all">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                    Memenuhi Syarat (Num)
                  </span>
                  <span className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                </div>
                <CardTitle className="text-[24px] sm:text-[28px] font-black tracking-tight text-foreground flex items-baseline gap-1 mt-1">
                  <NumberFlow value={analytics.totalNum} />
                  <span className="text-[12px] font-bold text-muted-foreground">laik</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-semibold">
                  <span className="text-muted-foreground">Rasio Kelaikan Wilayah</span>
                  <span className="font-bold text-emerald-600">{analytics.overallRatio}%</span>
                </div>
                <div className="text-[11px] font-medium text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{Math.max(0, analytics.totalDen - analytics.totalNum)} sarana belum laik</span>
                </div>
              </CardContent>
            </Card>

            {/* KPI 4: Status Ketercapaian & Verifikasi */}
            <Card className="rounded-card border border-border shadow-subtle hover:border-primary/40 transition-all">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                    Status Program & Target
                  </span>
                  <span className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
                    <Target className="w-4 h-4" />
                  </span>
                </div>
                <CardTitle className="text-[24px] sm:text-[28px] font-black tracking-tight text-foreground flex items-baseline gap-1 mt-1">
                  <NumberFlow value={analytics.achievedCount} />
                  <span className="text-[14px] font-bold text-muted-foreground">/{analytics.list.length}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-2">
                <div className="grid grid-cols-3 gap-1 text-center pt-0.5">
                  <div className="bg-primary/10 rounded-md py-1">
                    <span className="block text-[12px] font-black text-primary">{analytics.achievedCount}</span>
                    <span className="text-[9px] font-bold text-primary/70 uppercase">Tercapai</span>
                  </div>
                  <div className="bg-amber-500/10 rounded-md py-1">
                    <span className="block text-[12px] font-black text-amber-600">{analytics.deficitCount}</span>
                    <span className="text-[9px] font-bold text-amber-600/70 uppercase">Defisit</span>
                  </div>
                  <div className="bg-muted rounded-md py-1">
                    <span className="block text-[12px] font-black text-muted-foreground">{analytics.emptyCount}</span>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Kosong</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── TABS NAVIGASI ANALITIK UTAMA ── */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
              <TabsList className="bg-surface border border-border h-11 p-1 rounded-xl">
                <TabsTrigger
                  value="matriks"
                  className="rounded-lg text-[12px] font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all px-3 sm:px-4"
                >
                  <ListChecks className="w-4 h-4" />
                  Matriks Kinerja & Data Riil
                </TabsTrigger>
                <TabsTrigger
                  value="visual"
                  className="rounded-lg text-[12px] font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all px-3 sm:px-4"
                >
                  <BarChart3 className="w-4 h-4" />
                  Grafik Komparasi
                </TabsTrigger>
                <TabsTrigger
                  value="isian"
                  className="rounded-lg text-[12px] font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all px-3 sm:px-4"
                >
                  <Layers className="w-4 h-4" />
                  Rincian Nilai Isian
                </TabsTrigger>
                <TabsTrigger
                  value="prioritas"
                  className="rounded-lg text-[12px] font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all px-3 sm:px-4"
                >
                  <Sparkles className="w-4 h-4" />
                  Analisis Kesenjangan & Aksi
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 font-bold border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {analytics.approvedLaporan} Disetujui Dinkes
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 font-bold border border-amber-500/20">
                  <Clock className="w-3.5 h-3.5" />
                  {analytics.submittedLaporan} Menunggu Review
                </span>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════
                TAB 1: MATRIKS KINERJA & DATA RIIL (LENGKAP NUM/DEN)
            ══════════════════════════════════════════════════════════ */}
            <TabsContent value="matriks" className="space-y-4 m-0 focus-visible:outline-none">
              <Card className="rounded-card border border-border shadow-subtle">
                <CardHeader className="p-4 sm:p-5 border-b border-border bg-surface-subtle/30">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-[15px] sm:text-[17px] font-extrabold text-foreground">
                        Matriks Evaluasi Kinerja Program Kesling
                      </CardTitle>
                      <CardDescription className="text-[11px] sm:text-[12px] font-medium text-muted-foreground mt-0.5">
                        Menampilkan perbandingan capaian riil (Numerator / Denominator), target dinas, deviasi gap, dan
                        status persetujuan.
                      </CardDescription>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="relative min-w-[200px]">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Cari indikator / kode..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="h-9 pl-8 text-[12px] rounded-lg border-border bg-surface"
                        />
                      </div>
                      <div className="inline-flex items-center p-0.5 rounded-lg border border-border bg-surface text-[11px] font-bold">
                        <Button
                          type="button"
                          variant={statusFilter === "ALL" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setStatusFilter("ALL")}
                          className="h-7 px-2.5 text-[11px]"
                        >
                          Semua ({analytics.list.length})
                        </Button>
                        <Button
                          type="button"
                          variant={statusFilter === "ACHIEVED" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setStatusFilter("ACHIEVED")}
                          className={`h-7 px-2.5 text-[11px] ${statusFilter === "ACHIEVED" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                        >
                          Tercapai ({analytics.achievedCount})
                        </Button>
                        <Button
                          type="button"
                          variant={statusFilter === "DEFICIT" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setStatusFilter("DEFICIT")}
                          className={`h-7 px-2.5 text-[11px] ${statusFilter === "DEFICIT" ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}`}
                        >
                          Defisit ({analytics.deficitCount})
                        </Button>
                        <Button
                          type="button"
                          variant={statusFilter === "EMPTY" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setStatusFilter("EMPTY")}
                          className="h-7 px-2.5 text-[11px]"
                        >
                          Kosong ({analytics.emptyCount})
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-border bg-surface-subtle/50">
                          <TableHead className="w-12 text-center text-[11px] font-extrabold uppercase">No</TableHead>
                          <TableHead className="text-[11px] font-extrabold uppercase min-w-[220px]">
                            Program & Indikator
                          </TableHead>
                          <TableHead className="text-center text-[11px] font-extrabold uppercase">Target</TableHead>
                          <TableHead className="text-center text-[11px] font-extrabold uppercase">
                            Sasaran (Den)
                          </TableHead>
                          <TableHead className="text-center text-[11px] font-extrabold uppercase">
                            Memenuhi (Num)
                          </TableHead>
                          <TableHead className="text-center text-[11px] font-extrabold uppercase min-w-[150px]">
                            Capaian Riil
                          </TableHead>
                          <TableHead className="text-center text-[11px] font-extrabold uppercase">
                            Deviasi (Gap)
                          </TableHead>
                          <TableHead className="text-center text-[11px] font-extrabold uppercase">
                            Status Kinerja
                          </TableHead>
                          <TableHead className="text-center text-[11px] font-extrabold uppercase">
                            Status Laporan
                          </TableHead>
                          <TableHead className="text-right text-[11px] font-extrabold uppercase pr-5">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCategories.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={10} className="h-32 text-center">
                              <p className="text-[13px] font-bold text-muted-foreground">
                                Tidak ada program yang sesuai kriteria filter.
                              </p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredCategories.map((cat, idx) => (
                            <TableRow key={cat.code} className="hover:bg-surface-subtle/60 transition-colors">
                              <TableCell className="text-center text-[12px] font-bold text-muted-foreground">
                                {idx + 1}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2.5">
                                  <span className="w-8 h-8 rounded-lg bg-surface-subtle border border-border flex items-center justify-center text-[16px] shrink-0">
                                    {cat.icon}
                                  </span>
                                  <div>
                                    <p className="text-[13px] font-extrabold text-foreground leading-tight hover:text-primary transition-colors">
                                      {cat.nama}
                                    </p>
                                    <p className="text-[10px] font-mono font-semibold text-muted-foreground mt-0.5">
                                      {cat.code} • {cat.isRowBased ? "Format Baris" : "Format Agregat"}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center text-[13px] font-bold tabular-nums">
                                {cat.target}%
                              </TableCell>
                              <TableCell className="text-center text-[13px] font-bold tabular-nums text-foreground">
                                {cat.hasData ? cat.den : "—"}
                              </TableCell>
                              <TableCell className="text-center text-[13px] font-bold tabular-nums text-primary">
                                {cat.hasData ? cat.num : "—"}
                              </TableCell>
                              <TableCell className="text-center">
                                {cat.hasData ? (
                                  <div className="space-y-1 max-w-[130px] mx-auto">
                                    <div className="flex justify-between items-center text-[11px] font-bold tabular-nums">
                                      <span
                                        className={
                                          cat.isAchieved ? "text-primary font-black" : "text-amber-600 font-black"
                                        }
                                      >
                                        {cat.pct}%
                                      </span>
                                      <span className="text-[10px] text-muted-foreground">Tgt {cat.target}%</span>
                                    </div>
                                    <Progress
                                      value={Math.min(100, cat.pct)}
                                      className={`h-1.5 ${
                                        cat.isAchieved ? "[&>div]:bg-primary" : "[&>div]:bg-amber-500"
                                      }`}
                                    />
                                  </div>
                                ) : (
                                  <span className="text-[12px] font-semibold text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {cat.hasData ? (
                                  <span
                                    className={`inline-flex items-center gap-0.5 text-[12px] font-black tabular-nums ${
                                      cat.gap >= 0 ? "text-primary" : "text-amber-600"
                                    }`}
                                  >
                                    {cat.gap >= 0 ? "+" : ""}
                                    {cat.gap}%
                                  </span>
                                ) : (
                                  <span className="text-[12px] font-semibold text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {!cat.hasData ? (
                                  <Badge variant="outline" className="text-[10px] font-bold text-muted-foreground">
                                    Belum Ada Data
                                  </Badge>
                                ) : cat.isAchieved ? (
                                  <Badge
                                    variant="success"
                                    className="text-[10px] font-bold gap-1 bg-emerald-600 text-white"
                                  >
                                    <CheckCircle2 className="w-3 h-3" /> Tercapai
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="warning"
                                    className="text-[10px] font-bold gap-1 bg-amber-500 text-white"
                                  >
                                    <AlertTriangle className="w-3 h-3" /> Defisit
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {cat.status === "APPROVED" ? (
                                  <Badge variant="success" className="text-[10px] font-bold bg-emerald-600 text-white">
                                    Disetujui
                                  </Badge>
                                ) : cat.status === "SUBMITTED" ? (
                                  <Badge variant="warning" className="text-[10px] font-bold bg-amber-500 text-white">
                                    Menunggu
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[10px] font-bold text-muted-foreground">
                                    {cat.hasData ? "Draft" : "Kosong"}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right pr-5">
                                <Button
                                  asChild
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2.5 text-[11px] font-bold hover:bg-primary-subtle hover:text-primary gap-1"
                                >
                                  <Link href={`/laporan/${cat.code}?bulan=${bulan}&tahun=${tahun}`}>
                                    <span>Isi Laporan</span>
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                  </Link>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ══════════════════════════════════════════════════════════
                TAB 2: GRAFIK KOMPARASI & SEBARAN VOLUME (RECHARTS)
            ══════════════════════════════════════════════════════════ */}
            <TabsContent value="visual" className="space-y-6 m-0 focus-visible:outline-none">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Visual 1: Capaian vs Target */}
                <Card className="rounded-card border border-border shadow-subtle p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
                    <div>
                      <h3 className="text-[14px] sm:text-[15px] font-black text-foreground">
                        Komparasi Capaian Riil vs Target (%)
                      </h3>
                      <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                        Menampilkan performa setiap kategori terhadap target minimum 80% wilayah.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-extrabold uppercase">
                      <span className="flex items-center gap-1.5 text-primary">
                        <span className="w-2.5 h-2.5 rounded-sm bg-primary" /> Capaian
                      </span>
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="w-2.5 h-2.5 rounded-sm bg-border" /> Target
                      </span>
                    </div>
                  </div>

                  <div className="h-[360px] w-full">
                    {analytics.comparativeChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={analytics.comparativeChartData}
                          margin={{ top: 10, right: 10, left: -15, bottom: 25 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="var(--color-border)"
                            vertical={false}
                            opacity={0.5}
                          />
                          <XAxis
                            dataKey="name"
                            fontSize={10}
                            tick={{ fill: "var(--color-text-muted)" }}
                            angle={-30}
                            textAnchor="end"
                            height={40}
                          />
                          <YAxis domain={[0, 100]} fontSize={10} tick={{ fill: "var(--color-text-muted)" }} />
                          <RechartsTooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const d = payload[0]?.payload;
                              return (
                                <div className="rounded-card bg-surface border border-border shadow-float p-3 text-[12px] space-y-1.5">
                                  <p className="font-extrabold text-foreground pb-1 border-b border-border">
                                    {d.fullName}
                                  </p>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-muted-foreground">Capaian:</span>
                                    <span className="font-bold text-primary">
                                      {d.hasData ? `${d.capaian}%` : "Belum Ada"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-muted-foreground">Target:</span>
                                    <span className="font-bold text-foreground">{d.target}%</span>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-muted-foreground">Status:</span>
                                    <span
                                      className={`font-bold ${d.status === "Tercapai" ? "text-primary" : "text-amber-600"}`}
                                    >
                                      {d.status}
                                    </span>
                                  </div>
                                </div>
                              );
                            }}
                          />
                          <Bar dataKey="capaian" fill="var(--color-primary)" radius={[4, 4, 0, 0]} barSize={16}>
                            {analytics.comparativeChartData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  entry.hasData && entry.capaian >= entry.target
                                    ? "var(--color-primary)"
                                    : "var(--color-amber-500, #f59e0b)"
                                }
                              />
                            ))}
                          </Bar>
                          <Bar dataKey="target" fill="var(--color-border)" radius={[4, 4, 0, 0]} barSize={8} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-[12px]">
                        Belum ada data untuk grafik
                      </div>
                    )}
                  </div>
                </Card>

                {/* Visual 2: Volume Memenuhi Syarat vs Belum Memenuhi */}
                <Card className="rounded-card border border-border shadow-subtle p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
                    <div>
                      <h3 className="text-[14px] sm:text-[15px] font-black text-foreground">
                        Sebaran Volume Sasaran Terinspeksi
                      </h3>
                      <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                        Proporsi riil sarana yang memenuhi syarat vs belum memenuhi syarat.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-extrabold uppercase">
                      <span className="flex items-center gap-1.5 text-emerald-600">
                        <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" /> Memenuhi
                      </span>
                      <span className="flex items-center gap-1.5 text-amber-600">
                        <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Belum
                      </span>
                    </div>
                  </div>

                  <div className="h-[360px] w-full">
                    {analytics.volumeChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={analytics.volumeChartData}
                          margin={{ top: 10, right: 10, left: -15, bottom: 25 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="var(--color-border)"
                            vertical={false}
                            opacity={0.5}
                          />
                          <XAxis
                            dataKey="name"
                            fontSize={10}
                            tick={{ fill: "var(--color-text-muted)" }}
                            angle={-30}
                            textAnchor="end"
                            height={40}
                          />
                          <YAxis fontSize={10} tick={{ fill: "var(--color-text-muted)" }} />
                          <RechartsTooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const d = payload[0]?.payload;
                              return (
                                <div className="rounded-card bg-surface border border-border shadow-float p-3 text-[12px] space-y-1.5">
                                  <p className="font-extrabold text-foreground pb-1 border-b border-border">
                                    {d.fullName}
                                  </p>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-muted-foreground">Total Sasaran:</span>
                                    <span className="font-bold text-foreground">{d.total}</span>
                                  </div>
                                  <div className="flex justify-between gap-4 text-emerald-600">
                                    <span>Memenuhi Syarat:</span>
                                    <span className="font-bold">
                                      {d.memenuhi} ({d.persen}%)
                                    </span>
                                  </div>
                                  <div className="flex justify-between gap-4 text-amber-600">
                                    <span>Belum Memenuhi:</span>
                                    <span className="font-bold">{d.belumMemenuhi}</span>
                                  </div>
                                </div>
                              );
                            }}
                          />
                          <Bar dataKey="memenuhi" stackId="a" fill="#059669" radius={[0, 0, 0, 0]} barSize={20} />
                          <Bar dataKey="belumMemenuhi" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-[12px]">
                        Belum ada data sasaran untuk grafik sebaran
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* ══════════════════════════════════════════════════════════
                TAB 3: RINCIAN NILAI ISIAN PARAMETER LAPANGAN
            ══════════════════════════════════════════════════════════ */}
            <TabsContent value="isian" className="space-y-4 m-0 focus-visible:outline-none">
              <Card className="rounded-card border border-border shadow-subtle">
                <CardHeader className="p-4 sm:p-5 border-b border-border bg-surface-subtle/30">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-[15px] sm:text-[17px] font-extrabold text-foreground">
                        Telaah Isian Parameter Lapangan
                      </CardTitle>
                      <CardDescription className="text-[11px] sm:text-[12px] font-medium text-muted-foreground mt-0.5">
                        Eksplorasi nilai numerik & parameter spesifik yang diinputkan oleh operator pada formulir
                        inspeksi.
                      </CardDescription>
                    </div>

                    {/* Selector Kategori Aktif */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                      {analytics.list.map((c) => (
                        <Button
                          key={c.code}
                          type="button"
                          variant={activeCategoryCode === c.code ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedCategoryCode(c.code)}
                          className="h-8 px-3 text-[11px] font-bold whitespace-nowrap"
                        >
                          <span className="mr-1">{c.icon}</span> {c.nama}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {selectedLaporan.length === 0 ? (
                    <div className="p-8 text-center space-y-3">
                      <HelpCircle className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                      <p className="text-[13px] font-bold text-foreground">
                        Belum ada data isian untuk kategori ini pada periode terpilih.
                      </p>
                      <Button asChild size="sm" className="rounded-full text-[11px] font-bold">
                        <Link href={`/laporan/${activeCategoryCode}?bulan=${bulan}&tahun=${tahun}`}>
                          Isi Laporan Sekarang
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {selectedLaporan.map((lap, lapIdx) => (
                        <div key={lap.id || lapIdx} className="p-4 sm:p-6 space-y-4">
                          <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-border/60">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] font-extrabold uppercase">
                                Dokumen Laporan #{lapIdx + 1}
                              </Badge>
                              <Badge
                                variant={
                                  lap.status === "APPROVED"
                                    ? "success"
                                    : lap.status === "SUBMITTED"
                                      ? "warning"
                                      : "secondary"
                                }
                                className="text-[10px] font-bold"
                              >
                                Status: {lap.status}
                              </Badge>
                            </div>
                            <span className="text-[11px] font-mono text-muted-foreground">
                              Update: {new Date(lap.updatedAt || lap.createdAt).toLocaleDateString("id-ID")}
                            </span>
                          </div>

                          {/* Tabel Parameter & Nilai */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {lap.values.map((val) => (
                              <div
                                key={val.id}
                                className="p-3 rounded-lg border border-border bg-surface-subtle/50 flex flex-col justify-between"
                              >
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    {val.subCategory?.nama || val.parameter.code}
                                  </p>
                                  <p className="text-[12px] font-bold text-foreground mt-0.5">{val.parameter.nama}</p>
                                </div>
                                <div className="mt-2 pt-2 border-t border-border/50 flex items-baseline justify-between">
                                  <span className="text-[10px] text-muted-foreground font-medium">Nilai Terdata</span>
                                  <span className="text-[14px] font-black tabular-nums text-primary">
                                    {val.value || "0"}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ══════════════════════════════════════════════════════════
                TAB 4: ANALISIS KESENJANGAN & PRIORITAS TINDAK LANJUT
            ══════════════════════════════════════════════════════════ */}
            <TabsContent value="prioritas" className="space-y-6 m-0 focus-visible:outline-none">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Kolom Kiri: Defisit Prioritas Tindakan */}
                <Card className="rounded-card border border-amber-500/30 bg-amber-500/[0.02] shadow-subtle p-5 sm:p-6 space-y-4">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-border">
                    <span className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                      <TrendingDown className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-[14px] sm:text-[15px] font-black text-foreground">
                        Prioritas Intervensi: Program Di Bawah Target
                      </h3>
                      <p className="text-[11px] font-medium text-muted-foreground">
                        Daftar indikator dengan kesenjangan (gap) tertinggi yang memerlukan tindak lanjut lapangan.
                      </p>
                    </div>
                  </div>

                  {analytics.deficitPriority.length === 0 ? (
                    <div className="py-8 text-center text-emerald-700">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
                      <p className="text-[13px] font-black">Luar Biasa! Tidak Ada Program Defisit</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Seluruh indikator yang terdata telah memenuhi target wilayah.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {analytics.deficitPriority.map((c) => (
                        <div
                          key={c.code}
                          className="p-3.5 rounded-card bg-surface border border-border shadow-xs flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center text-[16px] shrink-0">
                              {c.icon}
                            </span>
                            <div className="min-w-0">
                              <p className="text-[13px] font-extrabold text-foreground truncate">{c.nama}</p>
                              <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">
                                Diperiksa: <span className="text-foreground font-bold">{c.den}</span> • Laik:{" "}
                                <span className="text-primary font-bold">{c.num}</span> • Belum Laik:{" "}
                                <span className="text-amber-600 font-bold">{c.nonCompliant}</span>
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[14px] font-black text-amber-600 tabular-nums">{c.gap}%</span>
                            <span className="block text-[9px] font-bold text-muted-foreground">
                              Capaian {c.pct}% / Tgt {c.target}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Kolom Kanan: Program Unggulan & Rekomendasi Aksi */}
                <div className="space-y-6">
                  {/* Program Unggulan */}
                  <Card className="rounded-card border border-emerald-500/30 bg-emerald-500/[0.02] shadow-subtle p-5 sm:p-6 space-y-4">
                    <div className="flex items-center gap-2.5 pb-2 border-b border-border">
                      <span className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                        <TrendingUp className="w-4 h-4" />
                      </span>
                      <div>
                        <h3 className="text-[14px] sm:text-[15px] font-black text-foreground">
                          Program Unggulan (Melampaui Target)
                        </h3>
                        <p className="text-[11px] font-medium text-muted-foreground">
                          Indikator dengan tingkat kepatuhan terbaik di wilayah kerja Puskesmas.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {analytics.topPerformers.slice(0, 3).map((c) => (
                        <div
                          key={c.code}
                          className="p-3 rounded-card bg-surface border border-border shadow-xs flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-[16px]">{c.icon}</span>
                            <span className="text-[12px] font-bold text-foreground">{c.nama}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[13px] font-black text-emerald-600 tabular-nums">{c.pct}%</span>
                            <span className="text-[9px] font-bold text-emerald-600/80 ml-1">(+{c.gap}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Rekomendasi Operasional Puskesmas */}
                  <Card className="rounded-card border border-border shadow-subtle p-5 sm:p-6 space-y-3">
                    <h3 className="text-[13px] font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Rekomendasi Tindak Lanjut Sanitarian
                    </h3>
                    <ul className="space-y-2 text-[12px] font-medium text-muted-foreground leading-relaxed">
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                        <span>
                          Prioritaskan Inspeksi Kesehatan Lingkungan (IKL) berkala pada sarana dengan status belum
                          memenuhi syarat.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                        <span>
                          Pastikan seluruh dokumen laporan yang masih berstatus <b>Draft</b> segera disubmit ke Dinas
                          Kesehatan sebelum batas akhir pelaporan bulanan.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                        <span>
                          Gunakan fitur <b>Rencana Bulanan</b> untuk menjadwalkan pembinaan lapangan sarana sanitasi
                          terpadu.
                        </span>
                      </li>
                    </ul>
                    <div className="pt-2 flex items-center gap-2 flex-wrap">
                      <Button asChild size="sm" variant="outline" className="text-[11px] font-bold rounded-lg h-8">
                        <Link href="/pemeriksaan">Input Pemeriksaan Lapangan</Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="text-[11px] font-bold rounded-lg h-8">
                        <Link href="/rencana-bulanan">Susun Rencana Kerja</Link>
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </TooltipProvider>
  );
}
