"use client";

import { ChevronLeft, ChevronRight, Database, Download, Search } from "lucide-react";
import { Fragment, useState } from "react";
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
}

type ValueMap = Record<string, string>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildKey(parameterId: number, subCategoryId?: number | null) {
  return subCategoryId != null ? `${subCategoryId}-${parameterId}` : `${parameterId}`;
}
function buildValueMap(values: DynamicLaporanValue[]): ValueMap {
  const map: ValueMap = {};
  for (const v of values) map[buildKey(v.parameterId, v.subCategoryId)] = v.value;
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
  const numParam = params.find((p) => p.code === formula.numeratorCode);
  const denParam = params.find((p) => p.code === formula.denominatorCode);
  if (!numParam || !denParam) return null;
  let numerator = 0,
    denominator = 0;
  if (isRowBased) {
    for (const sc of subCats) {
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

function pctColor(pct: number | null) {
  if (pct === null) return "text-[hsl(var(--muted-foreground))]";
  if (pct >= 80) return "text-[hsl(var(--success))]";
  if (pct >= 60) return "text-[hsl(var(--warning))]";
  return "text-[hsl(var(--error))]";
}

function pctBg(pct: number | null) {
  if (pct === null) return "bg-[hsl(var(--muted))]";
  if (pct >= 80) return "bg-[hsl(var(--success))]";
  if (pct >= 60) return "bg-[hsl(var(--warning))]";
  return "bg-[hsl(var(--error))]";
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface LaporanTableProps {
  category: DynamicCategoryFull;
  laporanList: DynamicLaporan[];
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

// ─── Component ────────────────────────────────────────────────────────────────

export function LaporanTable({
  category,
  laporanList,
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

  const hasData = paginatedList.length > 0 && !isLoading;

  // ── Summary stats ──
  const totalSubmitted = laporanList.length;
  const totalPuskesmas = puskesmasTotal;
  const avgPct = (() => {
    if (!category.formula || laporanList.length === 0) return null;
    let sum = 0,
      count = 0;
    for (const pkm of paginatedList) {
      const laporan = laporanList.find((l) => l.puskesmasId === pkm.id);
      if (!laporan) continue;
      const pct = calcCompliance(
        buildValueMap(laporan.values),
        category.parameters,
        category.subCategories,
        category.formula,
        category.isRowBased,
      );
      if (pct) {
        sum += Number(pct);
        count++;
      }
    }
    return count > 0 ? (sum / count).toFixed(1) : null;
  })();

  return (
    <div className="space-y-4">
      {/* ── Summary Stat Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Terinput</p>
          <p className="text-[22px] font-bold tabular-nums mt-1 text-[hsl(var(--foreground))]">
            {totalSubmitted}
            <span className="text-[14px] text-[hsl(var(--muted-foreground))] font-normal">/{totalPuskesmas}</span>
          </p>
        </div>
        <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
            Belum Input
          </p>
          <p className="text-[22px] font-bold tabular-nums mt-1 text-[hsl(var(--muted-foreground))]">
            {totalPuskesmas - totalSubmitted}
          </p>
        </div>
        <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
            Rata-rata Capaian
          </p>
          <p className={`text-[22px] font-bold tabular-nums mt-1 ${pctColor(avgPct ? Number(avgPct) : null)}`}>
            {avgPct ? `${avgPct}%` : "—"}
          </p>
        </div>
        <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Target</p>
          <p className="text-[22px] font-bold tabular-nums mt-1 text-[hsl(var(--foreground))]">80%</p>
        </div>
      </div>

      {/* ── Tab Bar (only for row-based) ── */}
      {isRowBased && (
        <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <div className="flex items-center overflow-x-auto border-b border-[hsl(var(--border))]">
            <button
              onClick={() => setActiveTab("ringkasan")}
              className={`px-4 py-2.5 text-[12px] font-bold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === "ringkasan"
                  ? "border-[hsl(var(--accent))] text-[hsl(var(--accent))]"
                  : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              }`}
            >
              Ringkasan
            </button>
            {category.subCategories.map((sc) => (
              <button
                key={sc.id}
                onClick={() => setActiveTab(String(sc.id))}
                className={`px-4 py-2.5 text-[12px] font-bold whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === String(sc.id)
                    ? "border-[hsl(var(--accent))] text-[hsl(var(--accent))]"
                    : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                }`}
              >
                {sc.nama}
              </button>
            ))}
          </div>

          {/* ── Toolbar ── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-b border-[hsl(var(--border))]">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--muted-foreground))] opacity-50" />
              <input
                type="text"
                placeholder="Cari puskesmas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px] font-medium text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] opacity-50 outline-none transition-colors focus:border-[hsl(var(--accent))] focus:opacity-100"
              />
            </div>
            <a
              href={`/api/export/${categoryCode}?bulan=${bulan}&tahun=${tahun}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </a>
          </div>

          {/* ── Table Content ── */}
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="py-16 flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-[hsl(var(--border))] border-t-[hsl(var(--accent))] animate-spin rounded-full" />
                <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  Memuat data...
                </p>
              </div>
            ) : paginatedList.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3">
                <div className="w-10 h-10 border border-[hsl(var(--border))] bg-[hsl(var(--muted))] flex items-center justify-center">
                  <Database className="w-5 h-5 text-[hsl(var(--muted-foreground))] opacity-50" />
                </div>
                <p className="text-[13px] font-bold text-[hsl(var(--foreground))]">Belum ada data laporan</p>
                <button
                  onClick={() => openForm()}
                  className="text-[11px] font-bold text-[hsl(var(--accent))] hover:underline"
                >
                  Klik "Input Laporan" untuk mulai mengisi data
                </button>
              </div>
            ) : activeTab === "ringkasan" ? (
              /* ── RINGKASAN TAB: Puskesmas | Status | Capaian (compact) ── */
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))]">
                    <th className="w-[40px] py-2.5 px-3 text-left text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                      #
                    </th>
                    <th className="py-2.5 px-3 text-left text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                      Puskesmas
                    </th>
                    <th className="py-2.5 px-3 text-center text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                      Status
                    </th>
                    {category.formula && (
                      <th className="py-2.5 px-3 text-right text-[10px] font-bold text-[hsl(var(--accent))] uppercase tracking-wider">
                        Capaian
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginatedList.map((pkm: any, i: number) => {
                    const laporan = laporanList.find((l) => l.puskesmasId === pkm.id);
                    const vm = laporan ? buildValueMap(laporan.values) : {};
                    const totalPct = calcCompliance(
                      vm,
                      category.parameters,
                      category.subCategories,
                      category.formula,
                      category.isRowBased,
                    );
                    const totalPctNum = totalPct ? Number(totalPct) : null;
                    const rowIdx = (currentPage - 1) * PAGE_SIZE + i;
                    return (
                      <tr
                        key={pkm.id}
                        onClick={() => onRowClick(pkm.id)}
                        className="cursor-pointer border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]/30 transition-colors"
                      >
                        <td className="py-2.5 px-3 text-[11px] font-medium text-[hsl(var(--muted-foreground))] tabular-nums">
                          {rowIdx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-[hsl(var(--muted))] flex items-center justify-center text-[10px] font-bold text-[hsl(var(--accent))] shrink-0">
                              {pkm.nama.charAt(0)}
                            </div>
                            <span className="text-[13px] font-semibold text-[hsl(var(--foreground))]">{pkm.nama}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {!laporan ? (
                            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">-</span>
                          ) : (
                            <StatusBadge status={laporan.status} />
                          )}
                        </td>
                        {category.formula && (
                          <td className="py-2.5 px-3">
                            {totalPctNum !== null ? (
                              <div className="flex items-center gap-2 justify-end">
                                <div className="w-24 h-2 bg-[hsl(var(--muted))] shrink-0">
                                  <div
                                    className={`h-full ${pctBg(totalPctNum)}`}
                                    style={{ width: `${Math.min(totalPctNum, 100)}%` }}
                                  />
                                </div>
                                <span
                                  className={`text-[14px] font-bold tabular-nums w-12 text-right ${pctColor(totalPctNum)}`}
                                >
                                  {totalPct}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-[hsl(var(--muted-foreground))] opacity-40">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              /* ── SUB-CATEGORY TAB: Puskesmas | params | % ── */
              (() => {
                const activeSc = category.subCategories.find((sc) => String(sc.id) === activeTab);
                if (!activeSc) return null;
                return (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[hsl(var(--border))]">
                        <th className="w-[40px] py-2.5 px-3 text-left text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                          #
                        </th>
                        <th className="py-2.5 px-3 text-left text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                          Puskesmas
                        </th>
                        {reportParameters.map((p) => (
                          <th
                            key={p.id}
                            className="py-2.5 px-3 text-center text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider whitespace-nowrap"
                          >
                            {p.nama}
                          </th>
                        ))}
                        {category.formula && (
                          <th className="py-2.5 px-3 text-center text-[10px] font-bold text-[hsl(var(--accent))] uppercase tracking-wider">
                            %
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedList.map((pkm: any, i: number) => {
                        const laporan = laporanList.find((l) => l.puskesmasId === pkm.id);
                        const vm = laporan ? buildValueMap(laporan.values) : {};
                        const scPct = calcSubCompliance(vm, category.parameters, activeSc.id, category.formula);
                        const scPctNum = scPct ? Number(scPct) : null;
                        const rowIdx = (currentPage - 1) * PAGE_SIZE + i;
                        return (
                          <tr
                            key={pkm.id}
                            onClick={() => onRowClick(pkm.id)}
                            className="cursor-pointer border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]/30 transition-colors"
                          >
                            <td className="py-2.5 px-3 text-[11px] font-medium text-[hsl(var(--muted-foreground))] tabular-nums">
                              {rowIdx + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-[hsl(var(--muted))] flex items-center justify-center text-[10px] font-bold text-[hsl(var(--accent))] shrink-0">
                                  {pkm.nama.charAt(0)}
                                </div>
                                <span className="text-[13px] font-semibold text-[hsl(var(--foreground))]">
                                  {pkm.nama}
                                </span>
                              </div>
                            </td>
                            {reportParameters.map((p) => {
                              const val = vm[buildKey(p.id, activeSc.id)];
                              return (
                                <td
                                  key={p.id}
                                  className={`py-2.5 px-3 text-center text-[12px] font-medium tabular-nums ${val ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))] opacity-40"}`}
                                >
                                  {val || "—"}
                                </td>
                              );
                            })}
                            {category.formula && (
                              <td className="py-2.5 px-3 text-center">
                                {scPctNum !== null ? (
                                  <div className="inline-flex flex-col items-center gap-1">
                                    <span className={`text-[13px] font-bold tabular-nums ${pctColor(scPctNum)}`}>
                                      {scPct}%
                                    </span>
                                    <div className="w-14 h-1.5 bg-[hsl(var(--muted))]">
                                      <div
                                        className={`h-full ${pctBg(scPctNum)}`}
                                        style={{ width: `${Math.min(scPctNum, 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-[hsl(var(--muted-foreground))] opacity-40">—</span>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()
            )}
          </div>
        </div>
      )}

      {/* ── Non-row-based: simple table ── */}
      {!isRowBased && (
        <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-b border-[hsl(var(--border))]">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--muted-foreground))] opacity-50" />
              <input
                type="text"
                placeholder="Cari puskesmas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px] font-medium text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] opacity-50 outline-none transition-colors focus:border-[hsl(var(--accent))] focus:opacity-100"
              />
            </div>
            <a
              href={`/api/export/${categoryCode}?bulan=${bulan}&tahun=${tahun}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </a>
          </div>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="py-16 flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-[hsl(var(--border))] border-t-[hsl(var(--accent))] animate-spin rounded-full" />
                <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  Memuat data...
                </p>
              </div>
            ) : paginatedList.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3">
                <div className="w-10 h-10 border border-[hsl(var(--border))] bg-[hsl(var(--muted))] flex items-center justify-center">
                  <Database className="w-5 h-5 text-[hsl(var(--muted-foreground))] opacity-50" />
                </div>
                <p className="text-[13px] font-bold text-[hsl(var(--foreground))]">Belum ada data laporan</p>
                <button
                  onClick={() => openForm()}
                  className="text-[11px] font-bold text-[hsl(var(--accent))] hover:underline"
                >
                  Klik "Input Laporan" untuk mulai mengisi data
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))]">
                    <th className="w-[40px] py-2.5 px-3 text-left text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                      #
                    </th>
                    <th className="py-2.5 px-3 text-left text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                      Puskesmas
                    </th>
                    <th className="py-2.5 px-3 text-center text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                      Status
                    </th>
                    {reportParameters.map((p) => (
                      <th
                        key={p.id}
                        className="py-2.5 px-3 text-center text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider whitespace-nowrap"
                      >
                        {p.nama}
                      </th>
                    ))}
                    {category.formula && (
                      <th className="py-2.5 px-3 text-center text-[10px] font-bold text-[hsl(var(--accent))] uppercase tracking-wider">
                        Capaian
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginatedList.map((pkm: any, i: number) => {
                    const laporan = laporanList.find((l) => l.puskesmasId === pkm.id);
                    const vm = laporan ? buildValueMap(laporan.values) : {};
                    const totalPct = calcCompliance(
                      vm,
                      category.parameters,
                      category.subCategories,
                      category.formula,
                      category.isRowBased,
                    );
                    const totalPctNum = totalPct ? Number(totalPct) : null;
                    const rowIdx = (currentPage - 1) * PAGE_SIZE + i;
                    return (
                      <tr
                        key={pkm.id}
                        onClick={() => onRowClick(pkm.id)}
                        className="cursor-pointer border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]/30 transition-colors"
                      >
                        <td className="py-2.5 px-3 text-[11px] font-medium text-[hsl(var(--muted-foreground))] tabular-nums">
                          {rowIdx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-[hsl(var(--muted))] flex items-center justify-center text-[10px] font-bold text-[hsl(var(--accent))] shrink-0">
                              {pkm.nama.charAt(0)}
                            </div>
                            <span className="text-[13px] font-semibold text-[hsl(var(--foreground))]">{pkm.nama}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {!laporan ? (
                            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">-</span>
                          ) : (
                            <StatusBadge status={laporan.status} />
                          )}
                        </td>
                        {reportParameters.map((p) => {
                          const val = vm[buildKey(p.id)];
                          return (
                            <td
                              key={p.id}
                              className={`py-2.5 px-3 text-center text-[12px] font-medium tabular-nums ${val ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))] opacity-40"}`}
                            >
                              {val || "—"}
                            </td>
                          );
                        })}
                        {category.formula && (
                          <td className="py-2.5 px-3 text-center">
                            {totalPctNum !== null ? (
                              <div className="inline-flex flex-col items-center gap-1">
                                <span className={`text-[14px] font-bold tabular-nums ${pctColor(totalPctNum)}`}>
                                  {totalPct}%
                                </span>
                                <div className="w-16 h-1.5 bg-[hsl(var(--muted))]">
                                  <div
                                    className={`h-full ${pctBg(totalPctNum)}`}
                                    style={{ width: `${Math.min(totalPctNum, 100)}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-[11px] text-[hsl(var(--muted-foreground))] opacity-40">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Pagination ── */}
      {hasData && totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
            Hal {currentPage} / {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p: number) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-7 h-7 flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((p, idx, arr) => (
                <Fragment key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span className="w-7 h-7 flex items-center justify-center text-[10px] text-[hsl(var(--muted-foreground))]">
                      ...
                    </span>
                  )}
                  <button
                    onClick={() => setCurrentPage(p)}
                    className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold transition-all ${
                      p === currentPage
                        ? "bg-[hsl(var(--accent))] text-white"
                        : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
                    }`}
                  >
                    {p}
                  </button>
                </Fragment>
              ))}
            <button
              onClick={() => setCurrentPage((p: number) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-7 h-7 flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
