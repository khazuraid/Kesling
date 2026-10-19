"use client";

import { ArrowRight, ChevronLeft, ChevronRight, Database, Download, Search } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
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
  let numerator = 0,
    denominator = 0;
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

  return (
    <div className="space-y-5">
      {/* ── Toolbar: tabs kiri, aksi kanan ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {isRowBased ? (
          <div className="inline-flex items-center gap-1 rounded-card border border-border bg-surface p-1 max-w-full overflow-x-auto shadow-subtle">
            <button
              onClick={() => setActiveTab("ringkasan")}
              className={`px-3.5 h-8 rounded-button text-[11px] font-bold whitespace-nowrap transition-colors ${
                activeTab === "ringkasan"
                  ? "bg-primary text-primary-foreground shadow-subtle"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Ringkasan
            </button>
            {category.subCategories.map((sc) => (
              <button
                key={sc.id}
                onClick={() => setActiveTab(String(sc.id))}
                className={`px-3.5 h-8 rounded-button text-[11px] font-bold whitespace-nowrap transition-colors ${
                  activeTab === String(sc.id)
                    ? "bg-primary text-primary-foreground shadow-subtle"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {sc.nama}
              </button>
            ))}
          </div>
        ) : (
          /* Distribution legend (non-row-based) */
          <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground">
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

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari puskesmas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-56 pl-9 pr-3 rounded-button bg-surface border border-border text-[12px] font-medium text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary shadow-subtle"
            />
          </div>
          <a
            href={`/api/export/${categoryCode}?bulan=${bulan}&tahun=${tahun}`}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-button border border-border bg-surface text-[11px] font-extrabold text-foreground hover:border-primary hover:text-primary transition shadow-subtle"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </a>
        </div>
      </div>

      {/* ── Body ── */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-border border-t-primary animate-spin rounded-full" />
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Memuat data...</p>
        </div>
      ) : paginatedList.length === 0 ? (
        <EmptyState
          icon={Database}
          title="Belum ada data laporan"
          description="Belum ada puskesmas yang menginput laporan untuk periode ini. Mulai dengan mengisi data sekarang."
          actionLabel="Input Laporan"
          onAction={() => openForm()}
        />
      ) : isRowBased && activeTab !== "ringkasan" ? (
        /* ── SUB-CATEGORY: dense table ── */
        (() => {
          const activeSc = category.subCategories.find((sc) => String(sc.id) === activeTab);
          if (!activeSc) return null;
          return (
            <div className="rounded-card border border-border bg-surface shadow-subtle overflow-hidden">
              <div className="overflow-x-auto max-h-[70vh]">
                <table className="w-full text-[12px]">
                  <thead className="sticky top-0 z-20 bg-surface shadow-[0_1px_0_0_var(--color-border)]">
                    <tr className="border-b border-border bg-surface">
                      <th className="w-[44px] py-3 px-4 text-left text-[10px] font-extrabold text-muted-foreground uppercase tracking-[0.15em] bg-surface">
                        #
                      </th>
                      <th className="py-3 px-4 text-left text-[10px] font-extrabold text-muted-foreground uppercase tracking-[0.15em] bg-surface">
                        Puskesmas
                      </th>
                      {reportParameters.map((p) => (
                        <th
                          key={p.id}
                          className="py-3 px-4 text-center text-[10px] font-extrabold text-muted-foreground uppercase tracking-[0.15em] whitespace-nowrap bg-surface"
                        >
                          {p.nama}
                        </th>
                      ))}
                      {category.formula && (
                        <th className="py-3 px-4 text-right text-[10px] font-extrabold text-primary uppercase tracking-[0.15em] bg-surface">
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
                      const tier = tierOf(scPctNum);
                      const rowIdx = (currentPage - 1) * PAGE_SIZE + i;
                      return (
                        <tr
                          key={pkm.id}
                          onClick={() => onRowClick(pkm.id)}
                          className="cursor-pointer border-b border-border/60 hover:bg-surface-subtle transition-colors"
                        >
                          <td className="py-3 px-4 text-[11px] font-bold text-muted-foreground tabular-nums">
                            {rowIdx + 1}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <span className={`w-1.5 h-6 rounded-full shrink-0 ${tierStyles[tier].ring}`} />
                              <span className="text-[12px] font-bold text-foreground">{pkm.nama}</span>
                            </div>
                          </td>
                          {reportParameters.map((p) => {
                            const val = vm[buildKey(p.id, activeSc.id)];
                            return (
                              <td
                                key={p.id}
                                className={`py-3 px-4 text-center font-semibold tabular-nums ${
                                  val ? "text-foreground" : "text-muted-foreground opacity-40"
                                }`}
                              >
                                {val || "—"}
                              </td>
                            );
                          })}
                          {category.formula && (
                            <td className="py-3 px-4 text-right">
                              <span
                                className={`inline-flex items-center h-6 px-2.5 rounded-full text-[11px] font-extrabold tabular-nums ${tierStyles[tier].chip}`}
                              >
                                {scPct !== null ? `${scPct}%` : "—"}
                              </span>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()
      ) : (
        /* ── RINGKASAN: card list ── */
        <div className="space-y-2">
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
            const tier = tierOf(totalPctNum);
            const t = tierStyles[tier];
            const rowIdx = (currentPage - 1) * PAGE_SIZE + i;

            return (
              <button
                key={pkm.id}
                onClick={() => onRowClick(pkm.id)}
                className="group w-full text-left rounded-card border border-border bg-surface hover:border-primary/50 shadow-subtle hover:shadow-float transition-all overflow-hidden"
              >
                <div className="flex items-stretch">
                  {/* Tier rail */}
                  <div className={`w-1 shrink-0 ${t.ring}`} />

                  <div className="flex-1 flex items-center gap-4 px-5 py-4 min-w-0">
                    {/* Rank */}
                    <span className="text-[11px] font-bold text-muted-foreground tabular-nums w-6 shrink-0">
                      {String(rowIdx + 1).padStart(2, "0")}
                    </span>

                    {/* Identity */}
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-foreground truncate">{pkm.nama}</p>
                      <div className="mt-1">
                        {!laporan ? (
                          <span className="text-[10px] font-semibold text-muted-foreground">Belum input</span>
                        ) : (
                          <StatusBadge status={laporan.status} />
                        )}
                      </div>
                    </div>

                    {/* Parameter values (non-row-based only, inline chips) */}
                    {!isRowBased && (
                      <div className="hidden lg:flex items-center gap-4 shrink-0">
                        {reportParameters.slice(0, 4).map((p) => {
                          const val = vm[buildKey(p.id)];
                          return (
                            <div key={p.id} className="text-right">
                              <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
                                {p.nama}
                              </p>
                              <p
                                className={`text-[13px] font-extrabold tabular-nums ${
                                  val ? "text-foreground" : "text-muted-foreground opacity-40"
                                }`}
                              >
                                {val || "—"}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Capaian gauge */}
                    {category.formula && (
                      <div className="shrink-0 w-32">
                        <div className="flex items-baseline justify-end gap-1 mb-1.5">
                          <span className={`text-[18px] font-black tabular-nums leading-none ${t.text}`}>
                            {totalPct !== null ? totalPct : "—"}
                          </span>
                          {totalPct !== null && <span className={`text-[10px] font-bold ${t.text}`}>%</span>}
                        </div>
                        <div className="h-1.5 bg-surface-subtle rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${t.bar}`}
                            style={{ width: `${Math.min(totalPctNum ?? 0, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Chevron */}
                    <ArrowRight className="w-4 h-4 shrink-0 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-primary transition-all" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {hasData && totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
            {String(currentPage).padStart(2, "0")} — {String(totalPages).padStart(2, "0")}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p: number) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 px-3 flex items-center gap-1 rounded-button border border-border bg-surface text-[11px] font-bold text-muted-foreground hover:border-primary hover:text-primary shadow-subtle disabled:opacity-30 disabled:hover:border-border disabled:hover:text-muted-foreground transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <button
              onClick={() => setCurrentPage((p: number) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 px-3 flex items-center gap-1 rounded-button border border-border bg-surface text-[11px] font-bold text-muted-foreground hover:border-primary hover:text-primary shadow-subtle disabled:opacity-30 disabled:hover:border-border disabled:hover:text-muted-foreground transition-colors"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
