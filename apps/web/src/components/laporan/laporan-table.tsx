"use client";

import {
  AlertCircle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  FileSpreadsheet,
  Layers,
  Search,
  Sigma,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DynamicParameter {
  id: number;
  nama: string;
  code: string;
  type: string;
  required: boolean;
  isBaseline: boolean;
  urutan: number;
}
interface DynamicSubCategory {
  id: number;
  nama: string;
  grup: string | null;
  urutan: number;
}
interface DynamicComplianceFormula {
  numeratorCode: string;
  denominatorCode: string;
  description: string | null;
}
interface DynamicCategoryFull {
  id: number;
  nama: string;
  code: string;
  icon: string;
  isRowBased: boolean;
  parameters: DynamicParameter[];
  subCategories: DynamicSubCategory[];
  formula: DynamicComplianceFormula | null;
}
interface DynamicLaporanValue {
  parameterId: number;
  subCategoryId: number | null;
  value: string;
}
interface DynamicLaporan {
  id: number;
  puskesmasId: number;
  puskesmas: { id: number; nama: string };
  values: DynamicLaporanValue[];
  status: string;
  catatan?: string | null;
}

type ValueMap = Record<string, string>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isLaporanRejected(laporan?: DynamicLaporan | null): boolean {
  if (!laporan) return false;
  return laporan.status === "REJECTED" || (laporan.status === "DRAFT" && Boolean(laporan.catatan));
}

function buildKey(parameterId: number, subCategoryId?: number | null) {
  return subCategoryId != null ? `${subCategoryId}-${parameterId}` : `${parameterId}`;
}

function buildValueMap(values?: DynamicLaporanValue[] | null): ValueMap {
  const map: ValueMap = {};
  for (const v of values || []) map[buildKey(v.parameterId, v.subCategoryId)] = v.value;
  return map;
}

function calcCompliance(
  valueMap: ValueMap,
  params: DynamicParameter[],
  subCats: DynamicSubCategory[],
  formula: DynamicComplianceFormula | null,
  isRowBased: boolean,
) {
  if (!formula) return null;
  const numParam = (params || []).find((p) => p.code === formula.numeratorCode);
  const denParam = (params || []).find((p) => p.code === formula.denominatorCode);
  if (!numParam || !denParam) return null;
  let numerator = 0;
  let denominator = 0;
  if (isRowBased) {
    for (const sc of subCats || []) {
      numerator += Number(valueMap[buildKey(numParam.id, sc.id)] || 0);
      denominator += Number(valueMap[buildKey(denParam.id, sc.id)] || 0);
    }
  } else {
    numerator = Number(valueMap[buildKey(numParam.id)] || 0);
    denominator = Number(valueMap[buildKey(denParam.id)] || 0);
  }
  if (denominator === 0) return null;
  return ((numerator / denominator) * 100).toFixed(1);
}

function calcSubCompliance(
  vm: ValueMap,
  params: DynamicParameter[],
  subCatId: number,
  formula: DynamicComplianceFormula | null,
) {
  if (!formula) return null;
  const numParam = params.find((p) => p.code === formula.numeratorCode);
  const denParam = params.find((p) => p.code === formula.denominatorCode);
  if (!numParam || !denParam) return null;
  const numerator = Number(vm[buildKey(numParam.id, subCatId)] || 0);
  const denominator = Number(vm[buildKey(denParam.id, subCatId)] || 0);
  if (denominator === 0) return null;
  return ((numerator / denominator) * 100).toFixed(1);
}

function tierOf(pct: number | null): "high" | "mid" | "low" | "none" {
  if (pct === null) return "none";
  if (pct >= 80) return "high";
  if (pct >= 60) return "mid";
  return "low";
}

const tierStyles = {
  high: {
    ring: "bg-primary",
    text: "text-primary",
    chip: "bg-primary-subtle text-primary",
    bar: "bg-primary",
  },
  mid: {
    ring: "bg-[#E8A33D]",
    text: "text-[#C07F1F]",
    chip: "bg-[#E8A33D]/10 text-[#C07F1F]",
    bar: "bg-[#E8A33D]",
  },
  low: {
    ring: "bg-[#E15A4F]",
    text: "text-[#E15A4F]",
    chip: "bg-[#E15A4F]/10 text-[#E15A4F]",
    bar: "bg-[#E15A4F]",
  },
  none: {
    ring: "bg-border",
    text: "text-muted-foreground",
    chip: "bg-surface-subtle text-muted-foreground",
    bar: "bg-border",
  },
};

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

// ─── Props ────────────────────────────────────────────────────────────────────

interface LaporanTableProps {
  category: DynamicCategoryFull;
  laporanList: DynamicLaporan[];
  cumulativeData?: Record<number, Record<string, number>>;
  isLoading: boolean;
  paginatedList: any[];
  currentPage: number;
  totalPages: number;
  PAGE_SIZE: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  setCurrentPage: (p: number | ((prev: number) => number)) => void;
  laporanCount: number;
  puskesmasTotal: number;
  categoryCode: string;
  bulan: number;
  tahun: number;
  onRowClick: (pkmId: number) => void;
  openForm: () => void;
}

export type ViewMode = "monthly" | "cumulative" | "split";

// ─── Component ────────────────────────────────────────────────────────────────

export function LaporanTable({
  category,
  laporanList,
  cumulativeData = {},
  isLoading,
  paginatedList,
  currentPage,
  totalPages,
  PAGE_SIZE,
  searchQuery,
  setSearchQuery,
  setCurrentPage,
  puskesmasTotal,
  categoryCode,
  bulan,
  tahun,
  onRowClick,
  openForm,
}: LaporanTableProps) {
  const isRowBased = category.isRowBased && category.subCategories.length > 0;
  const reportParameters = category.parameters.filter(
    (p) => !p.isBaseline || p.type === "NUMBER" || p.type === "DECIMAL",
  );
  const [activeTab, setActiveTab] = useState<string>("ringkasan");
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");

  const hasData = paginatedList.length > 0 && !isLoading;

  // ── Distribution stats (for header strip) ──
  const dist = { high: 0, mid: 0, low: 0, none: 0 };
  for (const laporan of laporanList) {
    const pct = calcCompliance(
      buildValueMap(laporan.values),
      category.parameters,
      category.subCategories,
      category.formula,
      category.isRowBased,
    );
    dist[tierOf(pct ? Number(pct) : null)]++;
  }
  dist.none += Math.max(0, puskesmasTotal - laporanList.length);

  // ── Perhitungan Total Kota (Rekapitulasi Excel Footer) ──
  const totalKota = useMemo(() => {
    const monthlySum: Record<string, number> = {};
    const cumulativeSum: Record<string, number> = {};

    // 1. Akumulasi bulan ini dari semua laporan terisi
    for (const lap of laporanList) {
      for (const val of lap.values) {
        const key = buildKey(val.parameterId, val.subCategoryId);
        const num = parseFloat(val.value) || 0;
        monthlySum[key] = (monthlySum[key] || 0) + num;
      }
    }

    // 2. Akumulasi kumulatif tahun berjalan dari cumulativeData
    for (const pkmId in cumulativeData) {
      const pkmMap = cumulativeData[pkmId];
      for (const key in pkmMap) {
        cumulativeSum[key] = (cumulativeSum[key] || 0) + (pkmMap[key] || 0);
      }
    }

    return { monthly: monthlySum, cumulative: cumulativeSum };
  }, [laporanList, cumulativeData]);

  // Total capaian kota %
  const totalKotaMonthlyPct = useMemo(() => {
    if (!category.formula) return null;
    const strMap: ValueMap = {};
    for (const k in totalKota.monthly) strMap[k] = String(totalKota.monthly[k]);
    return calcCompliance(strMap, category.parameters, category.subCategories, category.formula, category.isRowBased);
  }, [totalKota.monthly, category]);

  const totalKotaCumulativePct = useMemo(() => {
    if (!category.formula) return null;
    const strMap: ValueMap = {};
    for (const k in totalKota.cumulative) strMap[k] = String(totalKota.cumulative[k]);
    return calcCompliance(strMap, category.parameters, category.subCategories, category.formula, category.isRowBased);
  }, [totalKota.cumulative, category]);

  const bulanStr = BULAN_NAMES[bulan] || `Bulan ${bulan}`;

  return (
    <div className="space-y-4">
      {/* ── SPREADSHEET TOOLBAR ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 bg-surface border border-border rounded-xl shadow-xs">
        {/* Sisi Kiri: Sheet Tab Navigasi */}
        <div className="flex flex-wrap items-center gap-1.5">
          {isRowBased ? (
            <div className="flex flex-wrap items-center gap-1 bg-surface-subtle border border-border/80 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTab("ringkasan")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                  activeTab === "ringkasan"
                    ? "bg-surface text-primary shadow-xs border border-border/80 font-black"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Ringkasan</span>
              </button>
              {category.subCategories.map((sc) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => setActiveTab(String(sc.id))}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                    activeTab === String(sc.id)
                      ? "bg-surface text-primary shadow-xs border border-border/80 font-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>{sc.nama}</span>
                </button>
              ))}
            </div>
          ) : (
            /* Distribution legend (non-row-based) */
            <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground px-1">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary" /> ≥80% ({dist.high})
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#E8A33D]" /> 60–79% ({dist.mid})
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#E15A4F]" /> &lt;60% ({dist.low})
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-border" /> Belum ({dist.none})
              </span>
            </div>
          )}
        </div>

        {/* Sisi Kanan: Segmented Control View Excel + Filter & Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Excel View Mode */}
          <div className="flex items-center bg-surface-subtle border border-border p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode("monthly")}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                viewMode === "monthly"
                  ? "bg-surface text-foreground shadow-xs font-black border border-border/70"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={`Hanya data ${bulanStr} ${tahun}`}
            >
              Bulan Ini
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cumulative")}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                viewMode === "cumulative"
                  ? "bg-surface text-primary shadow-xs font-black border border-border/70"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={`Akumulasi Jan s/d ${bulanStr} ${tahun}`}
            >
              Kumulatif (Jan–{bulanStr.slice(0, 3)})
            </button>
            <button
              type="button"
              onClick={() => setViewMode("split")}
              className={`hidden sm:inline-flex px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                viewMode === "split"
                  ? "bg-surface text-emerald-600 dark:text-emerald-400 shadow-xs font-black border border-border/70"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Tampilkan berdampingan (Bulan Ini + Kumulatif)"
            >
              Split Excel
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cari puskesmas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-44 sm:w-52 pl-8 pr-3 text-[11px] font-medium rounded-lg"
            />
          </div>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 rounded-lg shadow-xs gap-1.5 text-[11px] font-bold"
          >
            <a href={`/api/export/${categoryCode}?bulan=${bulan}&tahun=${tahun}`}>
              <Download className="w-3.5 h-3.5" /> Export Excel
            </a>
          </Button>
        </div>
      </div>

      {/* ── SPREADSHEET TABLE BODY ── */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 bg-surface border border-border rounded-xl">
          <div className="w-7 h-7 border-2 border-border border-t-primary animate-spin rounded-full" />
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
            Memuat spreadsheet data...
          </p>
        </div>
      ) : paginatedList.length === 0 ? (
        <EmptyState
          icon={Database}
          title="Belum ada data laporan"
          description="Belum ada puskesmas yang menginput laporan untuk periode ini. Mulai dengan mengisi data spreadsheet sekarang."
          actionLabel="Buka Input Excel"
          onAction={() => openForm()}
        />
      ) : isRowBased && activeTab !== "ringkasan" ? (
        /* ── SUB-CATEGORY SHEET VIEW: Dense Excel Grid ── */
        (() => {
          const activeSc = category.subCategories.find((sc) => String(sc.id) === activeTab);
          if (!activeSc) return null;

          return (
            <Card className="overflow-hidden border border-border shadow-xs bg-surface rounded-xl">
              <div className="overflow-x-auto max-h-[75vh] scrollbar-thin">
                <Table className="border-collapse border-spacing-0 w-full text-xs">
                  {/* Excel Style Tiered Header */}
                  <TableHeader className="sticky top-0 z-20 bg-surface shadow-[0_1px_0_0_var(--color-border)]">
                    {/* Header Baris 1: Grup Kolom */}
                    <TableRow className="border-b border-border bg-surface-subtle text-foreground text-[11px] font-black tracking-tight divide-x divide-border">
                      <TableHead className="w-[48px] text-center sticky left-0 z-30 bg-surface-subtle" rowSpan={2}>
                        No
                      </TableHead>
                      <TableHead className="min-w-[200px] sticky left-[48px] z-30 bg-surface-subtle" rowSpan={2}>
                        Puskesmas
                      </TableHead>

                      {reportParameters.map((p) => {
                        if (viewMode === "split") {
                          return (
                            <TableHead
                              key={p.id}
                              colSpan={2}
                              className="text-center font-black py-1.5 px-3 uppercase tracking-wider text-[10px] bg-surface-subtle/80"
                            >
                              {p.nama}
                            </TableHead>
                          );
                        }
                        return (
                          <TableHead
                            key={p.id}
                            className="text-center font-black py-2 px-3 uppercase tracking-wider text-[10px] whitespace-nowrap"
                            rowSpan={2}
                          >
                            <div className="flex flex-col items-center">
                              <span>{p.nama}</span>
                              <span className="text-[9px] font-normal text-muted-foreground lowercase">
                                {viewMode === "cumulative" ? "(kumulatif)" : "(bln ini)"}
                              </span>
                            </div>
                          </TableHead>
                        );
                      })}

                      {category.formula && (
                        <TableHead
                          className="text-right text-primary font-black py-2 px-4 whitespace-nowrap min-w-[90px]"
                          rowSpan={viewMode === "split" ? 1 : 2}
                          colSpan={viewMode === "split" ? 2 : 1}
                        >
                          {viewMode === "split" ? "% Capaian" : "% Capaian"}
                        </TableHead>
                      )}
                    </TableRow>

                    {/* Header Baris 2: Sub-Kolom khusus Split Mode */}
                    {viewMode === "split" && (
                      <TableRow className="border-b border-border bg-surface text-[10px] font-bold text-muted-foreground divide-x divide-border">
                        {reportParameters.map((p) => (
                          <div key={p.id} style={{ display: "contents" }}>
                            <TableHead className="text-right px-2.5 py-1 text-foreground/80 font-semibold w-24">
                              Bln Ini
                            </TableHead>
                            <TableHead className="text-right px-2.5 py-1 text-primary font-bold w-24 bg-primary-subtle/10">
                              Kumulatif
                            </TableHead>
                          </div>
                        ))}
                        {category.formula && (
                          <div style={{ display: "contents" }}>
                            <TableHead className="text-right px-2.5 py-1 font-semibold w-20">Bln Ini</TableHead>
                            <TableHead className="text-right px-2.5 py-1 text-primary font-bold w-20 bg-primary-subtle/10">
                              Kumulatif
                            </TableHead>
                          </div>
                        )}
                      </TableRow>
                    )}
                  </TableHeader>

                  {/* Excel Data Rows */}
                  <TableBody className="divide-y divide-border/60">
                    {paginatedList.map((pkm: any, i: number) => {
                      const laporan = laporanList.find((l) => l.puskesmasId === pkm.id);
                      const vm = laporan ? buildValueMap(laporan.values) : {};
                      const pkmCum = cumulativeData[pkm.id] || {};

                      // Capaian bulanan
                      const scPct = calcSubCompliance(vm, category.parameters, activeSc.id, category.formula);
                      const scPctNum = scPct ? Number(scPct) : null;

                      // Capaian kumulatif
                      const cumVm: ValueMap = {};
                      for (const k in pkmCum) cumVm[k] = String(pkmCum[k]);
                      const scCumPct = calcSubCompliance(cumVm, category.parameters, activeSc.id, category.formula);
                      const scCumPctNum = scCumPct ? Number(scCumPct) : null;

                      const activePctNum = viewMode === "cumulative" ? scCumPctNum : scPctNum;
                      const tier = tierOf(activePctNum);
                      const rowIdx = (currentPage - 1) * PAGE_SIZE + i;

                      return (
                        <TableRow
                          key={pkm.id}
                          onClick={() => onRowClick(pkm.id)}
                          className="cursor-pointer hover:bg-surface-subtle/80 transition-colors divide-x divide-border/50 group"
                        >
                          {/* Col 1: Row Index (Sticky) */}
                          <TableCell className="text-center font-mono text-[11px] text-muted-foreground sticky left-0 z-10 bg-surface group-hover:bg-surface-subtle/80">
                            {rowIdx + 1}
                          </TableCell>

                          {/* Col 2: Puskesmas Nama (Sticky Frozen) */}
                          <TableCell className="sticky left-[48px] z-10 bg-surface group-hover:bg-surface-subtle/80 py-2.5">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-2">
                                <span className={`w-1.5 h-4 rounded-full shrink-0 ${tierStyles[tier].ring}`} />
                                <span className="text-[12px] font-bold text-foreground truncate">{pkm.nama}</span>
                              </div>
                              {isLaporanRejected(laporan) && (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-destructive/10 border border-destructive/25 text-[10px] text-destructive font-semibold mt-1">
                                  <AlertCircle className="w-3 h-3 shrink-0" />
                                  <span
                                    className="truncate max-w-[240px]"
                                    title={laporan?.catatan || "Laporan dikembalikan / ditolak"}
                                  >
                                    Ditolak: {laporan?.catatan || "Perlu revisi data"}
                                  </span>
                                </div>
                              )}
                            </div>
                          </TableCell>

                          {/* Col Param Value Data */}
                          {reportParameters.map((p) => {
                            const key = buildKey(p.id, activeSc.id);
                            const valMonth = vm[key];
                            const numMonth = valMonth ? parseFloat(valMonth) || 0 : 0;
                            const numCum = pkmCum[key] || 0;

                            if (viewMode === "split") {
                              return (
                                <div key={p.id} style={{ display: "contents" }}>
                                  <TableCell className="text-right font-mono text-[11px] tabular-nums px-2.5 py-2 text-foreground font-medium">
                                    {valMonth ? numMonth.toLocaleString("id-ID") : "—"}
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-[11px] tabular-nums px-2.5 py-2 text-primary font-bold bg-primary-subtle/5">
                                    {numCum > 0 ? numCum.toLocaleString("id-ID") : "—"}
                                  </TableCell>
                                </div>
                              );
                            }

                            const displayNum = viewMode === "cumulative" ? numCum : numMonth;
                            const hasVal = viewMode === "cumulative" ? numCum > 0 : !!valMonth;

                            return (
                              <TableCell
                                key={p.id}
                                className={`text-right font-mono text-[11px] tabular-nums px-3 py-2 font-semibold ${
                                  hasVal ? "text-foreground font-bold" : "text-muted-foreground/40"
                                }`}
                              >
                                {hasVal ? displayNum.toLocaleString("id-ID") : "—"}
                              </TableCell>
                            );
                          })}

                          {/* Col Formula % */}
                          {category.formula &&
                            (viewMode === "split" ? (
                              <div style={{ display: "contents" }}>
                                <TableCell className="text-right font-mono text-[11px] font-bold tabular-nums px-2.5 py-2 text-foreground">
                                  {scPct !== null ? `${scPct}%` : "—"}
                                </TableCell>
                                <TableCell className="text-right font-mono text-[11px] font-black tabular-nums px-2.5 py-2 text-primary bg-primary-subtle/5">
                                  {scCumPct !== null ? `${scCumPct}%` : "—"}
                                </TableCell>
                              </div>
                            ) : (
                              <TableCell className="text-right font-mono text-[11px] px-3 py-2">
                                <Badge
                                  variant={tier === "high" ? "success" : tier === "mid" ? "warning" : "secondary"}
                                  className="font-mono text-[10px] font-extrabold px-1.5 py-0"
                                >
                                  {activePctNum !== null ? `${activePctNum}%` : "—"}
                                </Badge>
                              </TableCell>
                            ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>

                  {/* Excel Style Summary Footer: TOTAL KOTA */}
                  <TableFooter className="sticky bottom-0 z-20 bg-surface-subtle border-t-2 border-border font-black divide-x divide-border">
                    <TableRow className="border-t border-border bg-surface-subtle font-black text-foreground">
                      <TableCell className="text-center sticky left-0 z-30 bg-surface-subtle font-black">
                        <Sigma className="w-3.5 h-3.5 mx-auto text-primary" />
                      </TableCell>
                      <TableCell className="sticky left-[48px] z-30 bg-surface-subtle text-[11px] font-black uppercase tracking-wider text-primary">
                        TOTAL KOTA
                      </TableCell>

                      {reportParameters.map((p) => {
                        const key = buildKey(p.id, activeSc.id);
                        const sumMonth = totalKota.monthly[key] || 0;
                        const sumCum = totalKota.cumulative[key] || 0;

                        if (viewMode === "split") {
                          return (
                            <div key={p.id} style={{ display: "contents" }}>
                              <TableCell className="text-right font-mono text-[11px] font-black tabular-nums px-2.5 py-2 text-foreground">
                                {sumMonth.toLocaleString("id-ID")}
                              </TableCell>
                              <TableCell className="text-right font-mono text-[11px] font-black tabular-nums px-2.5 py-2 text-primary bg-primary-subtle/10">
                                {sumCum.toLocaleString("id-ID")}
                              </TableCell>
                            </div>
                          );
                        }

                        const sumDisplay = viewMode === "cumulative" ? sumCum : sumMonth;
                        return (
                          <TableCell
                            key={p.id}
                            className="text-right font-mono text-[11px] font-black tabular-nums px-3 py-2 text-foreground"
                          >
                            {sumDisplay.toLocaleString("id-ID")}
                          </TableCell>
                        );
                      })}

                      {category.formula &&
                        (viewMode === "split" ? (
                          <div style={{ display: "contents" }}>
                            <TableCell className="text-right font-mono text-[11px] font-black tabular-nums px-2.5 py-2 text-foreground">
                              {totalKotaMonthlyPct ? `${totalKotaMonthlyPct}%` : "—"}
                            </TableCell>
                            <TableCell className="text-right font-mono text-[11px] font-black tabular-nums px-2.5 py-2 text-primary bg-primary-subtle/10">
                              {totalKotaCumulativePct ? `${totalKotaCumulativePct}%` : "—"}
                            </TableCell>
                          </div>
                        ) : (
                          <TableCell className="text-right font-mono text-[11px] font-black tabular-nums px-3 py-2 text-primary">
                            {viewMode === "cumulative"
                              ? totalKotaCumulativePct
                                ? `${totalKotaCumulativePct}%`
                                : "—"
                              : totalKotaMonthlyPct
                                ? `${totalKotaMonthlyPct}%`
                                : "—"}
                          </TableCell>
                        ))}
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </Card>
          );
        })()
      ) : (
        /* ── RINGKASAN SHEET VIEW: Modern Interactive Card Grid ── */
        <div className="space-y-2.5">
          {paginatedList.map((pkm: any, i: number) => {
            const laporan = laporanList.find((l) => l.puskesmasId === pkm.id);
            const vm = laporan ? buildValueMap(laporan.values) : {};
            const pkmCum = cumulativeData[pkm.id] || {};

            // Nilai % bulan ini vs kumulatif
            const totalPct = calcCompliance(
              vm,
              category.parameters,
              category.subCategories,
              category.formula,
              category.isRowBased,
            );
            const totalPctNum = totalPct ? Number(totalPct) : null;

            const cumVm: ValueMap = {};
            for (const k in pkmCum) cumVm[k] = String(pkmCum[k]);
            const totalCumPct = calcCompliance(
              cumVm,
              category.parameters,
              category.subCategories,
              category.formula,
              category.isRowBased,
            );
            const totalCumPctNum = totalCumPct ? Number(totalCumPct) : null;

            const activePctNum = viewMode === "cumulative" ? totalCumPctNum : totalPctNum;
            const activePctStr = viewMode === "cumulative" ? totalCumPct : totalPct;
            const tier = tierOf(activePctNum);
            const t = tierStyles[tier];
            const rowIdx = (currentPage - 1) * PAGE_SIZE + i;

            return (
              <button
                key={pkm.id}
                type="button"
                onClick={() => onRowClick(pkm.id)}
                className="group w-full text-left rounded-xl border border-border bg-surface hover:border-primary/50 shadow-xs hover:shadow-subtle transition-all overflow-hidden"
              >
                <div className="flex items-stretch">
                  {/* Tier Left Accent Bar */}
                  <div className={`w-1.5 shrink-0 ${t.ring}`} />

                  <div className="flex-1 flex items-center gap-4 px-5 py-3.5 min-w-0">
                    {/* Index Monospace */}
                    <span className="text-[11px] font-mono font-bold text-muted-foreground tabular-nums w-6 shrink-0">
                      {String(rowIdx + 1).padStart(2, "0")}
                    </span>

                    {/* Puskesmas Identity */}
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-foreground truncate">{pkm.nama}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        {!laporan ? (
                          <span className="text-[10px] font-semibold text-muted-foreground">Belum input</span>
                        ) : (
                          <StatusBadge status={laporan.status} />
                        )}
                        {isLaporanRejected(laporan) && (
                          <span
                            className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-destructive bg-destructive/10 border border-destructive/25 px-2.5 py-0.5 rounded-md"
                            title={laporan?.catatan || "Laporan dikembalikan untuk perbaikan"}
                          >
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            Ditolak: {laporan?.catatan || "Perlu revisi data"}
                          </span>
                        )}
                        {viewMode === "cumulative" && (
                          <span className="text-[10px] font-mono text-primary font-semibold">
                            (Akumulasi s/d {bulanStr.slice(0, 3)})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Parameter values for non-row-based */}
                    {!isRowBased && (
                      <div className="hidden lg:flex items-center gap-5 shrink-0">
                        {reportParameters.slice(0, 4).map((p) => {
                          const key = buildKey(p.id);
                          const valMonth = vm[key];
                          const numMonth = valMonth ? parseFloat(valMonth) || 0 : 0;
                          const numCum = pkmCum[key] || 0;

                          return (
                            <div key={p.id} className="text-right min-w-[70px]">
                              <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                                {p.nama}
                              </p>
                              {viewMode === "split" ? (
                                <p className="text-[12px] font-mono font-bold tabular-nums text-foreground">
                                  <span>{numMonth}</span>
                                  <span className="text-muted-foreground mx-1">/</span>
                                  <span className="text-primary">{numCum}</span>
                                </p>
                              ) : (
                                <p
                                  className={`text-[12px] font-mono font-bold tabular-nums ${
                                    (viewMode === "cumulative" ? numCum > 0 : !!valMonth)
                                      ? "text-foreground font-black"
                                      : "text-muted-foreground opacity-40"
                                  }`}
                                >
                                  {viewMode === "cumulative"
                                    ? numCum.toLocaleString("id-ID")
                                    : valMonth
                                      ? numMonth.toLocaleString("id-ID")
                                      : "—"}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Capaian Gauge */}
                    {category.formula && (
                      <div className="shrink-0 w-36 text-right">
                        <div className="flex items-baseline justify-end gap-1 mb-1">
                          <span className={`text-[17px] font-mono font-black tabular-nums leading-none ${t.text}`}>
                            {activePctStr !== null ? activePctStr : "—"}
                          </span>
                          {activePctStr !== null && <span className={`text-[10px] font-bold ${t.text}`}>%</span>}
                        </div>
                        <div className="h-1.5 bg-surface-subtle rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${t.bar}`}
                            style={{ width: `${Math.min(activePctNum ?? 0, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <ArrowRight className="w-4 h-4 shrink-0 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-primary transition-all" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── PAGINATION BAR ── */}
      {hasData && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] font-mono font-semibold text-muted-foreground tabular-nums">
            Halaman {String(currentPage).padStart(2, "0")} dari {String(totalPages).padStart(2, "0")}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p: number) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 px-3 gap-1 shadow-xs rounded-lg text-[11px]"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p: number) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 px-3 gap-1 shadow-xs rounded-lg text-[11px]"
            >
              Selanjutnya <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
