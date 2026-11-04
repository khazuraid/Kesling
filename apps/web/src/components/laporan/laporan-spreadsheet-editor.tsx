"use client";

import {
  AlertCircle,
  Building2,
  ChevronLeft,
  ChevronRight,
  Columns,
  FilePenLine,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  Sigma,
  Sparkles,
} from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";

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

function buildKey(parameterId: number, subCategoryId?: number | null) {
  return subCategoryId != null ? `${subCategoryId}-${parameterId}` : `${parameterId}`;
}

function buildValueMap(values?: DynamicLaporanValue[] | null): ValueMap {
  const map: ValueMap = {};
  for (const v of values || []) map[buildKey(v.parameterId, v.subCategoryId)] = v.value;
  return map;
}

function calcRowCompliance(
  vm: ValueMap,
  params: DynamicParameter[],
  subCatId: number | null,
  formula: DynamicComplianceFormula | null,
) {
  if (!formula) return null;
  const numParam = params.find((p) => p.code === formula.numeratorCode);
  const denParam = params.find((p) => p.code === formula.denominatorCode);
  if (!numParam || !denParam) return null;

  const numKey = buildKey(numParam.id, subCatId);
  const denKey = buildKey(denParam.id, subCatId);
  const numerator = parseFloat(vm[numKey] || "0") || 0;
  const denominator = parseFloat(vm[denKey] || "0") || 0;

  if (denominator === 0) return null;
  return ((numerator / denominator) * 100).toFixed(1);
}

const BULAN_SHORT = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];

// ─── Component Props ──────────────────────────────────────────────────────────

interface LaporanSpreadsheetEditorProps {
  category: DynamicCategoryFull;
  categoryCode: string;
  bulan: number;
  tahun: number;
  isOperator: boolean;
  puskesmasId: number;
  setPuskesmasId: (id: number) => void;
  puskesmasList: any[];
  laporanList: DynamicLaporan[];
  cumulativeData?: Record<number, Record<string, number>>;
  dataDasarList?: DynamicLaporan[];
  submitMutation: { isPending: boolean; mutate: (body: any) => void };
  onBackToRekap?: () => void;
  onOpenDataDasar?: () => void;
  onOpenCopyModal?: () => void;
  onSyncIkl?: () => void;
  syncPending?: boolean;
}

export function LaporanSpreadsheetEditor({
  category,
  categoryCode: _categoryCode,
  bulan,
  tahun: _tahun,
  isOperator,
  puskesmasId,
  setPuskesmasId,
  puskesmasList,
  laporanList,
  cumulativeData,
  dataDasarList = [],
  submitMutation,
  onBackToRekap,
  onOpenDataDasar: _onOpenDataDasar,
  onOpenCopyModal,
  onSyncIkl,
  syncPending = false,
}: LaporanSpreadsheetEditorProps) {
  const isRowBased = category.isRowBased && category.subCategories.length > 0;
  const reportParameters = useMemo(
    () => category.parameters.filter((p) => !p.isBaseline || p.type === "NUMBER" || p.type === "DECIMAL"),
    [category.parameters],
  );
  const scList = useMemo(() => category.subCategories || [], [category.subCategories]);

  // Current Puskesmas Laporan
  const currentLaporan = laporanList.find((l) => l.puskesmasId === puskesmasId);
  const statusLaporan = currentLaporan?.status || "DRAFT";
  const catatanPenolakan = currentLaporan?.catatan;

  // Local Form Values (Cell States)
  const [cellValues, setCellValues] = useState<ValueMap>({});
  const [dirty, setDirty] = useState(false);
  const [focusedCell, setFocusedCell] = useState<{ rowIdx: number; colIdx: number } | null>(null);
  const [displayMode, setDisplayMode] = useState<"input" | "split">("input");
  const isSplit = displayMode === "split";

  // Input refs for keyboard navigation: key = `${rowIdx}-${colIdx}`
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  // Sinkronkan data nilai sel ketika puskesmas atau laporanList berubah
  useEffect(() => {
    const existing = laporanList.find((l) => l.puskesmasId === puskesmasId);
    const prefilled: ValueMap = existing ? buildValueMap(existing.values) : {};

    // Fallback baseline dari data dasar bila belum terisi
    if (dataDasarList.length > 0) {
      const baselineData = dataDasarList.find((l) => l.puskesmasId === puskesmasId);
      if (baselineData) {
        for (const v of baselineData.values) {
          const k = buildKey(v.parameterId, v.subCategoryId);
          if (!prefilled[k] || prefilled[k] === "0") {
            prefilled[k] = v.value;
          }
        }
      }
    }

    setCellValues(prefilled);
    setDirty(false);
  }, [puskesmasId, laporanList, dataDasarList]);

  // Update cell handler
  const handleCellChange = useCallback((key: string, val: string) => {
    setCellValues((prev) => ({ ...prev, [key]: val }));
    setDirty(true);
  }, []);

  // Save handler (Draft / Submit / Approve / Reject)
  const handleSave = useCallback(
    (targetStatus = "SUBMITTED") => {
      const values: { parameterId: number; subCategoryId: number | null; value: string }[] = [];

      if (isRowBased) {
        for (const sc of scList) {
          for (const p of reportParameters) {
            const key = buildKey(p.id, sc.id);
            if (cellValues[key] !== undefined && cellValues[key] !== "") {
              values.push({ parameterId: p.id, subCategoryId: sc.id, value: cellValues[key] });
            }
          }
        }
      } else {
        for (const p of reportParameters) {
          const key = buildKey(p.id);
          if (cellValues[key] !== undefined && cellValues[key] !== "") {
            values.push({ parameterId: p.id, subCategoryId: null, value: cellValues[key] });
          }
        }
      }

      submitMutation.mutate({
        puskesmasId,
        values,
        isDataDasar: false,
        status: targetStatus,
      });
      setDirty(false);
    },
    [isRowBased, scList, reportParameters, cellValues, puskesmasId, submitMutation],
  );

  // Shortcut Ctrl+S / Cmd+S untuk simpan cepat
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave(statusLaporan === "SUBMITTED" ? "SUBMITTED" : "DRAFT");
        toast.info("Menyimpan draft spreadsheet...");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave, statusLaporan]);

  // Keyboard navigation across cells (Excel-like)
  const handleKeyDownCell = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIdx: number,
    colIdx: number,
    totalRows: number,
    totalCols: number,
  ) => {
    let nextRow = rowIdx;
    let nextCol = colIdx;

    if (e.key === "Enter" || (e.key === "ArrowDown" && !e.altKey)) {
      e.preventDefault();
      nextRow = Math.min(totalRows - 1, rowIdx + 1);
    } else if (e.key === "ArrowUp" && !e.altKey) {
      e.preventDefault();
      nextRow = Math.max(0, rowIdx - 1);
    } else if (e.key === "Tab") {
      if (!e.shiftKey) {
        if (colIdx < totalCols - 1) {
          nextCol = colIdx + 1;
        } else if (rowIdx < totalRows - 1) {
          nextRow = rowIdx + 1;
          nextCol = 0;
        }
      } else {
        if (colIdx > 0) {
          nextCol = colIdx - 1;
        } else if (rowIdx > 0) {
          nextRow = rowIdx - 1;
          nextCol = totalCols - 1;
        }
      }
    }

    if (nextRow !== rowIdx || nextCol !== colIdx) {
      const nextKey = `${nextRow}-${nextCol}`;
      const targetEl = inputRefs.current.get(nextKey);
      if (targetEl) {
        targetEl.focus();
        targetEl.select();
      }
    }
  };

  // Stats kalkulasi pengisian
  const totalCells = isRowBased ? scList.length * reportParameters.length : reportParameters.length;
  const filledCount = Object.values(cellValues).filter((v) => v !== "" && v !== "0" && v !== "0.0").length;
  const pctFilled = totalCells > 0 ? Math.round((filledCount / totalCells) * 100) : 0;

  // Real-time Sum per Parameter Column
  const columnSums = useMemo(() => {
    const sums: Record<number, number> = {};
    for (const p of reportParameters) {
      let sum = 0;
      if (isRowBased) {
        for (const sc of scList) {
          const key = buildKey(p.id, sc.id);
          sum += parseFloat(cellValues[key] || "0") || 0;
        }
      } else {
        const key = buildKey(p.id);
        sum += parseFloat(cellValues[key] || "0") || 0;
      }
      sums[p.id] = sum;
    }
    return sums;
  }, [reportParameters, isRowBased, scList, cellValues]);

  // Prior cumulative values (Jan s/d Bulan - 1)
  const priorMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (bulan <= 1) return map;

    const existingReport = laporanList.find((l) => l.puskesmasId === puskesmasId);
    const existingMonthMap: Record<string, number> = {};
    for (const v of existingReport?.values || []) {
      const k = buildKey(v.parameterId, v.subCategoryId);
      existingMonthMap[k] = parseFloat(v.value) || 0;
    }

    const pkmCum = cumulativeData?.[puskesmasId] || {};
    for (const k in pkmCum) {
      const rawCum = pkmCum[k] || 0;
      const existingVal = existingMonthMap[k] || 0;
      map[k] = Math.max(0, rawCum - existingVal);
    }
    return map;
  }, [bulan, laporanList, puskesmasId, cumulativeData]);

  // Real-time cumulative value map (prior + active cell values)
  const cumulativeValuesMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (isRowBased) {
      for (const sc of scList) {
        for (const p of reportParameters) {
          const k = buildKey(p.id, sc.id);
          const prior = bulan <= 1 ? 0 : priorMap[k] || 0;
          const cur = parseFloat(cellValues[k] || "0") || 0;
          map[k] = String(prior + cur);
        }
      }
    } else {
      for (const p of reportParameters) {
        const k = buildKey(p.id);
        const prior = bulan <= 1 ? 0 : priorMap[k] || 0;
        const cur = parseFloat(cellValues[k] || "0") || 0;
        map[k] = String(prior + cur);
      }
    }
    return map;
  }, [isRowBased, scList, reportParameters, bulan, priorMap, cellValues]);

  // Real-time Sum per Parameter Cumulative Column
  const columnCumulativeSums = useMemo(() => {
    const sums: Record<number, number> = {};
    for (const p of reportParameters) {
      let sum = 0;
      if (isRowBased) {
        for (const sc of scList) {
          const key = buildKey(p.id, sc.id);
          sum += parseFloat(cumulativeValuesMap[key] || "0") || 0;
        }
      } else {
        const key = buildKey(p.id);
        sum += parseFloat(cumulativeValuesMap[key] || "0") || 0;
      }
      sums[p.id] = sum;
    }
    return sums;
  }, [reportParameters, isRowBased, scList, cumulativeValuesMap]);

  // Real-time Total Capaian % Puskesmas Ini
  const totalCapaianPct = useMemo(() => {
    if (!category.formula) return null;
    const numParam = reportParameters.find((p) => p.code === category.formula?.numeratorCode);
    const denParam = reportParameters.find((p) => p.code === category.formula?.denominatorCode);
    if (!numParam || !denParam) return null;

    const numSum = columnSums[numParam.id] || 0;
    const denSum = columnSums[denParam.id] || 0;
    if (denSum === 0) return null;
    return ((numSum / denSum) * 100).toFixed(1);
  }, [category.formula, reportParameters, columnSums]);

  // Real-time Total Capaian Kumulatif % Puskesmas Ini
  const totalCumulativeCapaianPct = useMemo(() => {
    if (!category.formula) return null;
    const numParam = reportParameters.find((p) => p.code === category.formula?.numeratorCode);
    const denParam = reportParameters.find((p) => p.code === category.formula?.denominatorCode);
    if (!numParam || !denParam) return null;

    const numSum = columnCumulativeSums[numParam.id] || 0;
    const denSum = columnCumulativeSums[denParam.id] || 0;
    if (denSum === 0) return null;
    return ((numSum / denSum) * 100).toFixed(1);
  }, [category.formula, reportParameters, columnCumulativeSums]);

  // Index pkm saat ini untuk navigasi Next/Prev Puskesmas (khusus Admin)
  const currentPkmIdx = puskesmasList.findIndex((p: any) => p.id === puskesmasId);
  const currentPkmNama = puskesmasList.find((p: any) => p.id === puskesmasId)?.nama || "Puskesmas";

  return (
    <div className="space-y-4">
      {/* ── TOP SPREADSHEET TOOLBAR ── */}
      <Card className="p-3.5 sm:p-4 bg-surface border-border shadow-xs rounded-xl space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Sisi Kiri: Selector Faskes / Status */}
          <div className="flex flex-wrap items-center gap-2.5">
            {onBackToRekap && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBackToRekap}
                className="h-9 px-3 rounded-lg text-xs font-bold gap-1.5 shadow-xs"
                title="Kembali ke tabel rekap seluruh puskesmas"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Rekap Kota
              </Button>
            )}

            {!isOperator ? (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-lg"
                  disabled={currentPkmIdx <= 0}
                  onClick={() => {
                    if (currentPkmIdx > 0) setPuskesmasId(puskesmasList[currentPkmIdx - 1].id);
                  }}
                  title="Puskesmas sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <Select
                  value={puskesmasId}
                  onChange={(e) => setPuskesmasId(Number(e.target.value))}
                  className="h-9 min-w-[200px] sm:min-w-[240px] text-xs font-bold rounded-lg border-border"
                >
                  {puskesmasList.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.nama}
                    </option>
                  ))}
                </Select>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-lg"
                  disabled={currentPkmIdx < 0 || currentPkmIdx >= puskesmasList.length - 1}
                  onClick={() => {
                    if (currentPkmIdx >= 0 && currentPkmIdx < puskesmasList.length - 1) {
                      setPuskesmasId(puskesmasList[currentPkmIdx + 1].id);
                    }
                  }}
                  title="Puskesmas selanjutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-subtle border border-border rounded-lg">
                <Building2 className="w-4 h-4 text-primary" />
                <span className="text-xs font-black text-foreground">{currentPkmNama}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <StatusBadge status={statusLaporan} />
              {dirty && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-bold bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300"
                >
                  Ada Perubahan (Belum Disimpan)
                </Badge>
              )}
            </div>

            {/* Toggle Tampilan Input vs Split Kumulatif */}
            <div className="flex items-center bg-surface-subtle border border-border p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setDisplayMode("input")}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                  !isSplit
                    ? "bg-surface text-foreground shadow-xs font-black border border-border/70"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Tampilkan hanya kolom input bulan ini"
              >
                Input Saja
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode("split")}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all flex items-center gap-1 ${
                  isSplit
                    ? "bg-surface text-primary shadow-xs font-black border border-border/70"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Tampilkan kolom input berdampingan dengan total kumulatif real-time"
              >
                <Columns className="w-3 h-3" /> Split Kumulatif
              </button>
            </div>
          </div>

          {/* Sisi Kanan: Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {onOpenCopyModal && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenCopyModal}
                className="h-9 rounded-lg text-xs font-semibold gap-1.5"
                title="Salin template/data dari bulan sebelumnya"
              >
                Salin Bulan Lalu
              </Button>
            )}

            {onSyncIkl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onSyncIkl}
                disabled={syncPending}
                className="h-9 rounded-lg text-xs font-semibold text-primary border-primary/30 bg-primary/5 hover:bg-primary/10 gap-1.5"
                title="Tarik data hasil pemeriksaan IKL bulan ini"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncPending ? "animate-spin" : ""}`} />
                {syncPending ? "Sinkron..." : "Tarik IKL"}
              </Button>
            )}

            {!isOperator && statusLaporan === "SUBMITTED" ? (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSave("REJECTED")}
                  disabled={submitMutation.isPending}
                  className="h-9 px-3 rounded-lg text-xs font-bold text-destructive border-destructive/30 hover:bg-destructive/10"
                >
                  Tolak
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSave("APPROVED")}
                  disabled={submitMutation.isPending}
                  className="h-9 px-4 rounded-lg text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Setujui
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSave("DRAFT")}
                  disabled={submitMutation.isPending}
                  className="h-9 px-3 rounded-lg text-xs font-bold gap-1.5"
                >
                  <FilePenLine className="w-3.5 h-3.5" />
                  Simpan Draft
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSave("SUBMITTED")}
                  disabled={submitMutation.isPending}
                  className="h-9 px-4 rounded-lg text-xs font-bold gap-1.5 shadow-xs"
                >
                  {submitMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  {submitMutation.isPending ? "Mengirim..." : "Kirim Laporan"}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Info Strip: Progress Pengisian & Indikator Rumus */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/80 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="font-semibold">
              Terisi: <strong className="text-foreground">{filledCount}</strong> dari {totalCells} sel ({pctFilled}%)
            </span>
            <div className="hidden sm:block w-32 h-1.5 bg-surface-subtle rounded-full overflow-hidden border border-border/60">
              <div
                className="h-full bg-primary transition-all duration-300 rounded-full"
                style={{ width: `${pctFilled}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline font-mono text-[10px] text-muted-foreground">
              Navigasi: <kbd className="px-1 py-0.5 rounded bg-surface-subtle border border-border font-sans">Tab</kbd>{" "}
              / <kbd className="px-1 py-0.5 rounded bg-surface-subtle border border-border font-sans">Enter</kbd> /{" "}
              <kbd className="px-1 py-0.5 rounded bg-surface-subtle border border-border font-sans">Ctrl+S</kbd>
            </span>
            {category.formula && (
              <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                <Sparkles className="w-3 h-3" />
                Capaian:{" "}
                <span className="font-mono text-xs font-black">
                  {totalCapaianPct !== null ? `${totalCapaianPct}%` : "0%"}
                </span>
                {isSplit && (
                  <span className="font-mono text-[10px] opacity-80 border-l border-primary/30 pl-1.5 ml-0.5">
                    Kum: {totalCumulativeCapaianPct !== null ? `${totalCumulativeCapaianPct}%` : "0%"}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Banner Penolakan (Jika ada catatan penolakan) */}
        {(statusLaporan === "REJECTED" || (statusLaporan === "DRAFT" && Boolean(catatanPenolakan))) && (
          <div className="flex items-start gap-3 p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive mt-2">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black uppercase tracking-wider">Perhatian: Laporan Dikembalikan</p>
              <p className="text-xs mt-0.5 text-foreground font-semibold">
                Alasan:{" "}
                <span className="text-destructive font-black">
                  {catatanPenolakan || "Perlu revisi data sebelum diajukan kembali."}
                </span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Ubah nilai pada tabel sel spreadsheet di bawah ini, lalu klik &quot;Kirim Laporan&quot; untuk mengajukan
                ulang.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* ── EXCEL SPREADSHEET TABLE GRID ── */}
      <Card className="border border-border bg-surface shadow-xs rounded-xl overflow-hidden">
        <div className="overflow-x-auto max-h-[72vh] scrollbar-thin">
          <table className="w-full border-collapse text-xs select-none">
            {/* ── Table Header (Excel style) ── */}
            <thead className="sticky top-0 z-20 bg-surface shadow-[0_1px_0_0_var(--color-border)]">
              <tr className="border-b border-border bg-surface-subtle text-foreground text-[11px] font-black tracking-tight divide-x divide-border">
                <th
                  rowSpan={isSplit ? 2 : 1}
                  className="w-12 py-2.5 px-2 text-center sticky left-0 z-30 bg-surface-subtle uppercase text-[10px] text-muted-foreground align-middle"
                >
                  No
                </th>
                <th
                  rowSpan={isSplit ? 2 : 1}
                  className="min-w-[240px] py-2.5 px-4 text-left sticky left-12 z-30 bg-surface-subtle uppercase text-[10px] text-muted-foreground align-middle"
                >
                  {isRowBased ? "Sub-Kategori / Sarana" : "Parameter Indikator"}
                </th>
                {reportParameters.map((p, colIdx) => (
                  <th
                    key={p.id}
                    colSpan={isSplit ? 2 : 1}
                    className="py-2.5 px-3 text-center uppercase text-[10px] tracking-wider text-foreground whitespace-nowrap"
                  >
                    <div className="flex flex-col items-center">
                      <span className="font-black text-foreground">{p.nama}</span>
                      <span className="text-[9px] font-mono text-muted-foreground font-normal">
                        Col {String.fromCharCode(67 + colIdx)}
                      </span>
                    </div>
                  </th>
                ))}
                {category.formula && (
                  <th
                    colSpan={isSplit ? 2 : 1}
                    className="py-2.5 px-3 text-center text-primary uppercase text-[10px] font-black whitespace-nowrap bg-primary/5"
                  >
                    % Capaian
                  </th>
                )}
              </tr>
              {isSplit && (
                <tr className="border-b border-border bg-surface text-[10px] font-bold text-muted-foreground divide-x divide-border">
                  {reportParameters.map((p) => (
                    <Fragment key={p.id}>
                      <th className="w-28 min-w-[100px] py-1 px-2 text-right uppercase text-[9px] font-extrabold text-foreground/80">
                        Bln Ini
                      </th>
                      <th className="w-28 min-w-[100px] py-1 px-2 text-right uppercase text-[9px] font-black text-primary bg-primary/5">
                        {bulan === 1 ? "Kum. (Jan)" : `Kum. (s/d ${BULAN_SHORT[bulan]})`}
                      </th>
                    </Fragment>
                  ))}
                  {category.formula && (
                    <>
                      <th className="w-20 min-w-[70px] py-1 px-1.5 text-center uppercase text-[9px] font-extrabold text-foreground/80">
                        Bln Ini
                      </th>
                      <th className="w-20 min-w-[70px] py-1 px-1.5 text-center uppercase text-[9px] font-black text-primary bg-primary/10">
                        Kumulatif
                      </th>
                    </>
                  )}
                </tr>
              )}
            </thead>

            {/* ── Table Body: Editable Rows ── */}
            <tbody className="divide-y divide-border/60">
              {isRowBased ? (
                /* Matrix Sub-Categories Rows */
                scList.map((sc, rowIdx) => {
                  const rowPct = calcRowCompliance(cellValues, category.parameters, sc.id, category.formula);
                  const rowCumPct = calcRowCompliance(
                    cumulativeValuesMap,
                    category.parameters,
                    sc.id,
                    category.formula,
                  );
                  const isRowFocused = focusedCell?.rowIdx === rowIdx;

                  return (
                    <tr
                      key={sc.id}
                      className={`divide-x divide-border/50 transition-colors ${
                        isRowFocused ? "bg-primary-subtle/20" : "hover:bg-surface-subtle/60"
                      }`}
                    >
                      {/* Col 1: Row Index (Sticky) */}
                      <td className="w-12 text-center font-mono text-[11px] font-bold text-muted-foreground sticky left-0 z-10 bg-surface">
                        {rowIdx + 1}
                      </td>

                      {/* Col 2: SubCategory Identity (Sticky) */}
                      <td className="min-w-[240px] py-2 px-4 sticky left-12 z-10 bg-surface">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-1.5 h-5 rounded-full shrink-0 ${
                              reportParameters.some((p) => {
                                const k = buildKey(p.id, sc.id);
                                return (cellValues[k] || "") !== "";
                              })
                                ? "bg-primary"
                                : "bg-border"
                            }`}
                          />
                          <span className="text-[12px] font-bold text-foreground truncate">{sc.nama}</span>
                          {sc.grup && (
                            <span className="ml-1 text-[10px] font-extrabold uppercase bg-primary-subtle text-primary px-1.5 py-0.5 rounded">
                              {sc.grup}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Col Data: Inputs & Optional Kumulatif */}
                      {reportParameters.map((p, colIdx) => {
                        const cellKey = buildKey(p.id, sc.id);
                        const val = cellValues[cellKey] ?? "";
                        const refKey = `${rowIdx}-${colIdx}`;
                        const isCellFocused = focusedCell?.rowIdx === rowIdx && focusedCell?.colIdx === colIdx;
                        const cumVal = parseFloat(cumulativeValuesMap[cellKey] || "0") || 0;

                        return (
                          <Fragment key={p.id}>
                            <td
                              className={`p-0 ${isSplit ? "w-28 min-w-[100px]" : "w-36 min-w-[130px]"} transition-colors ${
                                isCellFocused ? "bg-primary-subtle/30 ring-2 ring-primary ring-inset z-10" : ""
                              }`}
                            >
                              <input
                                ref={(el) => {
                                  if (el) inputRefs.current.set(refKey, el);
                                  else inputRefs.current.delete(refKey);
                                }}
                                type="number"
                                min={0}
                                step={p.type === "DECIMAL" ? "0.1" : "1"}
                                value={val}
                                placeholder="0"
                                onFocus={() => setFocusedCell({ rowIdx, colIdx })}
                                onBlur={() => setFocusedCell(null)}
                                onChange={(e) => handleCellChange(cellKey, e.target.value)}
                                onKeyDown={(e) =>
                                  handleKeyDownCell(e, rowIdx, colIdx, scList.length, reportParameters.length)
                                }
                                className={`w-full h-10 px-3 text-right font-mono text-[12px] font-bold tabular-nums bg-transparent border-0 outline-none transition-colors ${
                                  val !== "" && val !== "0"
                                    ? "text-foreground font-black"
                                    : "text-muted-foreground/50 placeholder:text-muted-foreground/30"
                                }`}
                              />
                            </td>
                            {isSplit && (
                              <td
                                tabIndex={-1}
                                className="w-28 min-w-[100px] px-2.5 py-2 text-right font-mono text-[12px] font-bold tabular-nums text-primary bg-primary/5 select-none"
                              >
                                {cumVal.toLocaleString("id-ID")}
                              </td>
                            )}
                          </Fragment>
                        );
                      })}

                      {/* Col Formula % */}
                      {category.formula && (
                        <>
                          <td
                            className={`${isSplit ? "w-20 min-w-[70px]" : "w-28"} text-center font-mono text-[11px] font-black px-2 py-2 bg-primary/5`}
                          >
                            {rowPct !== null ? (
                              <Badge
                                variant="outline"
                                className={`font-mono text-[10px] font-bold ${
                                  Number(rowPct) >= 80
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                                    : Number(rowPct) >= 60
                                      ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300"
                                      : "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300"
                                }`}
                              >
                                {rowPct}%
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground/40 font-mono">—</span>
                            )}
                          </td>
                          {isSplit && (
                            <td className="w-20 min-w-[70px] text-center font-mono text-[11px] font-black px-2 py-2 bg-primary/10 select-none">
                              {rowCumPct !== null ? (
                                <span className="text-primary font-bold">{rowCumPct}%</span>
                              ) : (
                                <span className="text-muted-foreground/40 font-mono">—</span>
                              )}
                            </td>
                          )}
                        </>
                      )}
                    </tr>
                  );
                })
              ) : (
                /* Non-Row Based Single Row Matrix */
                <tr className="divide-x divide-border/50 bg-surface">
                  <td className="w-12 text-center font-mono text-[11px] font-bold text-muted-foreground sticky left-0 z-10 bg-surface">
                    1
                  </td>
                  <td className="min-w-[240px] py-3 px-4 font-bold text-foreground sticky left-12 z-10 bg-surface">
                    {currentPkmNama}
                  </td>
                  {reportParameters.map((p, colIdx) => {
                    const cellKey = buildKey(p.id);
                    const val = cellValues[cellKey] ?? "";
                    const refKey = `0-${colIdx}`;
                    const isCellFocused = focusedCell?.rowIdx === 0 && focusedCell?.colIdx === colIdx;
                    const cumVal = parseFloat(cumulativeValuesMap[cellKey] || "0") || 0;

                    return (
                      <Fragment key={p.id}>
                        <td
                          className={`p-0 ${isSplit ? "w-28 min-w-[100px]" : "w-36 min-w-[130px]"} ${
                            isCellFocused ? "bg-primary-subtle/30 ring-2 ring-primary ring-inset z-10" : ""
                          }`}
                        >
                          <input
                            ref={(el) => {
                              if (el) inputRefs.current.set(refKey, el);
                              else inputRefs.current.delete(refKey);
                            }}
                            type="number"
                            min={0}
                            value={val}
                            placeholder="0"
                            onFocus={() => setFocusedCell({ rowIdx: 0, colIdx })}
                            onBlur={() => setFocusedCell(null)}
                            onChange={(e) => handleCellChange(cellKey, e.target.value)}
                            onKeyDown={(e) => handleKeyDownCell(e, 0, colIdx, 1, reportParameters.length)}
                            className="w-full h-11 px-3 text-right font-mono text-[13px] font-bold tabular-nums bg-transparent border-0 outline-none"
                          />
                        </td>
                        {isSplit && (
                          <td
                            tabIndex={-1}
                            className="w-28 min-w-[100px] px-2.5 py-2 text-right font-mono text-[12px] font-bold tabular-nums text-primary bg-primary/5 select-none"
                          >
                            {cumVal.toLocaleString("id-ID")}
                          </td>
                        )}
                      </Fragment>
                    );
                  })}
                  {category.formula && (
                    <>
                      <td
                        className={`${isSplit ? "w-20 min-w-[70px]" : "w-28"} text-center font-mono text-xs font-black px-2 py-2 bg-primary/5`}
                      >
                        {totalCapaianPct !== null ? `${totalCapaianPct}%` : "—"}
                      </td>
                      {isSplit && (
                        <td className="w-20 min-w-[70px] text-center font-mono text-xs font-black px-2 py-2 bg-primary/10 text-primary select-none">
                          {totalCumulativeCapaianPct !== null ? `${totalCumulativeCapaianPct}%` : "—"}
                        </td>
                      )}
                    </>
                  )}
                </tr>
              )}
            </tbody>

            {/* ── Excel Summary Footer: Total Baris / Formula ── */}
            <tfoot className="sticky bottom-0 z-20 bg-surface-subtle border-t-2 border-border font-black divide-x divide-border shadow-[0_-1px_0_0_var(--color-border)]">
              <tr className="border-t border-border bg-surface-subtle font-black text-foreground">
                <td className="w-12 text-center py-2.5 sticky left-0 z-30 bg-surface-subtle">
                  <Sigma className="w-3.5 h-3.5 mx-auto text-primary" />
                </td>
                <td className="min-w-[240px] py-2.5 px-4 text-[11px] uppercase tracking-wider text-primary sticky left-12 z-30 bg-surface-subtle font-black">
                  TOTAL KESELURUHAN
                </td>
                {reportParameters.map((p) => {
                  const sum = columnSums[p.id] || 0;
                  const cumSum = columnCumulativeSums[p.id] || 0;
                  return (
                    <Fragment key={p.id}>
                      <td
                        className={`${isSplit ? "w-28 min-w-[100px]" : "w-36 min-w-[130px]"} py-2.5 px-3 text-right font-mono text-[12px] font-black tabular-nums text-foreground`}
                      >
                        {sum.toLocaleString("id-ID")}
                      </td>
                      {isSplit && (
                        <td className="w-28 min-w-[100px] py-2.5 px-2.5 text-right font-mono text-[12px] font-black tabular-nums text-primary bg-primary/5">
                          {cumSum.toLocaleString("id-ID")}
                        </td>
                      )}
                    </Fragment>
                  );
                })}
                {category.formula && (
                  <>
                    <td
                      className={`${isSplit ? "w-20 min-w-[70px]" : "w-28"} py-2.5 px-2 text-center font-mono text-xs font-black text-primary bg-primary/10`}
                    >
                      {totalCapaianPct !== null ? `${totalCapaianPct}%` : "—"}
                    </td>
                    {isSplit && (
                      <td className="w-20 min-w-[70px] py-2.5 px-2 text-center font-mono text-xs font-black text-primary bg-primary/20">
                        {totalCumulativeCapaianPct !== null ? `${totalCumulativeCapaianPct}%` : "—"}
                      </td>
                    )}
                  </>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
