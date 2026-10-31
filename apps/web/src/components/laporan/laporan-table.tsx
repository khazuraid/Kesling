"use client";

import { ArrowRight, ChevronLeft, ChevronRight, Database, Download, Search } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
          <div className="flex flex-wrap items-center gap-1 rounded-card border border-border bg-surface p-1 shadow-subtle">
            <button
              type="button"
              onClick={() => setActiveTab("ringkasan")}
              className={`px-3.5 h-8 rounded-md text-[11px] font-bold text-left transition-colors ${
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
                type="button"
                onClick={() => setActiveTab(String(sc.id))}
                className={`px-3.5 h-8 rounded-md text-[11px] font-bold text-left transition-colors ${
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
            <Input
              type="text"
              placeholder="Cari puskesmas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-56 pl-9 pr-3 text-[12px]"
            />
          </div>
          <Button asChild variant="outline" size="sm" className="shadow-subtle gap-2">
            <a href={`/api/export/${categoryCode}?bulan=${bulan}&tahun=${tahun}`}>
              <Download className="w-3.5 h-3.5" /> Export
            </a>
          </Button>
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
            <Card className="overflow-hidden">
              <div className="overflow-x-auto max-h-[70vh]">
                <Table>
                  <TableHeader className="sticky top-0 z-20 bg-surface shadow-[0_1px_0_0_var(--color-border)]">
                    <TableRow className="border-b border-border bg-surface">
                      <TableHead className="w-[44px]">#</TableHead>
                      <TableHead>Puskesmas</TableHead>
                      {reportParameters.map((p) => (
                        <TableHead key={p.id} className="text-center whitespace-nowrap">
                          {p.nama}
                        </TableHead>
                      ))}
                      {category.formula && <TableHead className="text-right text-primary">%</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedList.map((pkm: any, i: number) => {
                      const laporan = laporanList.find((l) => l.puskesmasId === pkm.id);
                      const vm = laporan ? buildValueMap(laporan.values) : {};
                      const scPct = calcSubCompliance(vm, category.parameters, activeSc.id, category.formula);
                      const scPctNum = scPct ? Number(scPct) : null;
                      const tier = tierOf(scPctNum);
                      const rowIdx = (currentPage - 1) * PAGE_SIZE + i;
                      return (
                        <TableRow
                          key={pkm.id}
                          onClick={() => onRowClick(pkm.id)}
                          className="cursor-pointer hover:bg-surface-subtle transition-colors"
                        >
                          <TableCell className="font-bold text-muted-foreground tabular-nums">{rowIdx + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <span className={`w-1.5 h-6 rounded-full shrink-0 ${tierStyles[tier].ring}`} />
                              <span className="text-[12px] font-bold text-foreground">{pkm.nama}</span>
                            </div>
                          </TableCell>
                          {reportParameters.map((p) => {
                            const val = vm[buildKey(p.id, activeSc.id)];
                            return (
                              <TableCell
                                key={p.id}
                                className={`text-center font-semibold tabular-nums ${
                                  val ? "text-foreground" : "text-muted-foreground opacity-40"
                                }`}
                              >
                                {val || "—"}
                              </TableCell>
                            );
                          })}
                          {category.formula && (
                            <TableCell className="text-right">
                              <Badge
                                variant={tier === "high" ? "success" : tier === "mid" ? "warning" : "secondary"}
                                className="font-extrabold tabular-nums"
                              >
                                {scPct !== null ? `${scPct}%` : "—"}
                              </Badge>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
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
                type="button"
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
                              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p: number) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 px-3 gap-1 shadow-subtle"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p: number) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 px-3 gap-1 shadow-subtle"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
