"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Database, Layers, Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CopyTemplateModal } from "@/components/laporan/copy-template-modal";
import { DataDasarModal } from "@/components/laporan/data-dasar-modal";
import { LaporanFormModal } from "@/components/laporan/laporan-form-modal";
import { LaporanTable } from "@/components/laporan/laporan-table";
import { LaporanFilter } from "@/components/laporan-filter";
import { useLaporanFilter } from "@/hooks/use-laporan-filter";
import { usePuskesmasList } from "@/hooks/use-puskesmas-list";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

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

function buildKey(parameterId: number, subCategoryId?: number | null) {
  return subCategoryId != null ? `${subCategoryId}-${parameterId}` : `${parameterId}`;
}

function buildValueMap(values: DynamicLaporanValue[]): ValueMap {
  const map: ValueMap = {};
  for (const v of values) {
    map[buildKey(v.parameterId, v.subCategoryId)] = v.value;
  }
  return map;
}

function _calcCompliance(
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

  let numerator = 0;
  let denominator = 0;

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

const PAGE_SIZE = 10;

export default function DynamicLaporanPage() {
  const params = useParams();
  const categoryCode = typeof params.categoryCode === "string" ? params.categoryCode : "";

  const { bulan, tahun } = useLaporanFilter();
  const { data: session } = useSession();
  const { data: puskesmasList = [] } = usePuskesmasList();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [showDataDasarForm, setShowDataDasarForm] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyPuskesmasId, setCopyPuskesmasId] = useState<number>(0);
  const [copyBulanFrom, setCopyBulanFrom] = useState(bulan > 1 ? bulan - 1 : 12);
  const [copyTahunFrom, setCopyTahunFrom] = useState(bulan > 1 ? tahun : tahun - 1);
  const [formPuskesmasId, setFormPuskesmasId] = useState<number>(0);
  const [formValues, setFormValues] = useState<ValueMap>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  useUnsavedChanges(showForm);

  // ── Queries ──────────────────────────────────────────────────────────

  const { data: allCategories = [] } = useQuery<DynamicCategoryFull[]>({
    queryKey: ["master", "dynamic-categories"],
    queryFn: async () => {
      const res = await fetch("/api/master/dynamic-categories");
      if (!res.ok) throw new Error("Gagal memuat kategori");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const category = allCategories.find((c) => c.code.toLowerCase() === categoryCode.toLowerCase());

  const { data: laporanList = [], isLoading } = useQuery<DynamicLaporan[]>({
    queryKey: ["laporan", categoryCode, bulan, tahun],
    queryFn: async () => {
      const res = await fetch(`/api/laporan/${categoryCode}?bulan=${bulan}&tahun=${tahun}`);
      if (!res.ok) throw new Error("Gagal memuat data laporan");
      return res.json();
    },
    enabled: !!categoryCode,
    refetchInterval: 5000,
  });

  const { data: dataDasarList = [] } = useQuery<DynamicLaporan[]>({
    queryKey: ["laporan", categoryCode, 0, tahun],
    queryFn: async () => {
      const res = await fetch(`/api/laporan/${categoryCode}?bulan=0&tahun=${tahun}`);
      if (!res.ok) throw new Error("Gagal memuat data dasar");
      return res.json();
    },
    enabled: !!categoryCode,
    refetchInterval: 5000,
  });

  // ── Mutations ────────────────────────────────────────────────────────

  const copyMutation = useMutation({
    mutationFn: async () => {
      const pkmId = copyPuskesmasId || (session?.user as any)?.puskesmasId || puskesmasList[0]?.id;
      const res = await fetch("/api/laporan/copy-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryCode,
          puskesmasId: pkmId,
          bulanFrom: copyBulanFrom,
          tahunFrom: copyTahunFrom,
          bulanTo: bulan,
          tahunTo: tahun,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Gagal menyalin data");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message || "Data berhasil disalin");
      queryClient.invalidateQueries({ queryKey: ["laporan", categoryCode] });
      setShowCopyModal(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submitMutation = useMutation({
    mutationFn: async (body: {
      puskesmasId: number;
      values: { parameterId: number; subCategoryId: number | null; value: string }[];
      isDataDasar?: boolean;
      status?: string;
    }) => {
      const res = await fetch(`/api/laporan/${categoryCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, bulan, tahun }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Gagal menyimpan data");
      }
    },
    onSuccess: (_, variables) => {
      toast.success("Data berhasil disimpan");
      queryClient.invalidateQueries({ queryKey: ["laporan", categoryCode] });
      if (variables.isDataDasar) setShowDataDasarForm(false);
      else setShowForm(false);
      setShowForm(false);
    },
    onError: (e: Error) => {
      toast.error(e.message || "Gagal menyimpan data");
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────

  const openForm = useCallback(
    (pkmId?: number) => {
      const id = pkmId || (session?.user as any)?.puskesmasId || puskesmasList[0]?.id || 0;

      const baselineParams = category?.parameters.filter((p) => p.isBaseline) || [];
      if (baselineParams.length > 0) {
        const hasDataDasar = dataDasarList.some((l) => l.puskesmasId === id);
        if (!hasDataDasar) {
          alert(
            "Anda harus mengisi 'Atur Data Dasar' terlebih dahulu untuk instansi ini sebelum dapat menginput laporan bulanan.",
          );
          return;
        }
      }

      setFormPuskesmasId(id);

      const existing = laporanList.find((l) => l.puskesmasId === id);
      if (existing) {
        setFormValues(buildValueMap(existing.values));
      } else {
        if (baselineParams.length > 0 && dataDasarList.length > 0) {
          const baselineData = dataDasarList.find((l) => l.puskesmasId === id);
          if (baselineData) {
            const prefilled: ValueMap = {};
            for (const v of baselineData.values) {
              if (baselineParams.some((bp) => bp.id === v.parameterId)) {
                prefilled[buildKey(v.parameterId, v.subCategoryId)] = v.value;
              }
            }
            setFormValues(prefilled);
          } else {
            setFormValues({});
          }
        } else {
          setFormValues({});
        }
      }
      setShowForm(true);
    },
    [laporanList, dataDasarList, puskesmasList, session, category],
  );

  const openDataDasarForm = useCallback(
    (pkmId?: number) => {
      const id = pkmId || (session?.user as any)?.puskesmasId || puskesmasList[0]?.id || 0;
      setFormPuskesmasId(id);
      const existing = dataDasarList.find((l) => l.puskesmasId === id);
      if (existing) {
        setFormValues(buildValueMap(existing.values));
      } else {
        setFormValues({});
      }
      setShowDataDasarForm(true);
    },
    [dataDasarList, session, puskesmasList],
  );

  useEffect(() => {
    if (!formPuskesmasId && puskesmasList.length > 0) {
      const id = (session?.user as any)?.puskesmasId || puskesmasList[0]?.id || 0;
      setFormPuskesmasId(id);
    }
  }, [puskesmasList, session, formPuskesmasId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  function handleSubmit(e: React.FormEvent, isDataDasar = false, status = "DRAFT") {
    e.preventDefault();
    if (!category) return;

    const values: { parameterId: number; subCategoryId: number | null; value: string }[] = [];

    if (category.isRowBased) {
      for (const sc of category.subCategories) {
        for (const p of category.parameters) {
          const key = buildKey(p.id, sc.id);
          if (formValues[key] !== undefined) {
            values.push({ parameterId: p.id, subCategoryId: sc.id, value: formValues[key] });
          }
        }
      }
    } else {
      for (const p of category.parameters) {
        const key = buildKey(p.id);
        if (formValues[key] !== undefined) {
          values.push({ parameterId: p.id, subCategoryId: null, value: formValues[key] });
        }
      }
    }

    submitMutation.mutate({ puskesmasId: formPuskesmasId, values, isDataDasar, status });
  }

  // ── Derived state ──────────────────────────────────────────────────

  const isOperator = (session?.user as any)?.role === "OPERATOR";
  const filteredPuskesmasList = puskesmasList.filter((pkm: any) =>
    pkm.nama.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const totalPages = Math.ceil(filteredPuskesmasList.length / PAGE_SIZE);
  const paginatedList = filteredPuskesmasList.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // ── Category not found ──
  if (!category && allCategories.length > 0) {
    return (
      <div className="w-full mx-auto pb-4 space-y-4 fade-in">
        <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-12 h-12 bg-[hsl(var(--muted))] border border-[hsl(var(--border))] flex items-center justify-center">
            <Layers className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
          </div>
          <h3 className="text-[14px] font-bold text-[hsl(var(--foreground))]">Kategori Tidak Ditemukan</h3>
          <p className="text-[12px] text-[hsl(var(--muted-foreground))]">
            Modul data &quot;{categoryCode}&quot; belum tersedia di sistem.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto pb-4 space-y-4 fade-in">
      {/* ── Inline Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-lg">{category?.icon || "\uD83D\uDCC4"}</span>
          <h1 className="text-[16px] font-bold text-[hsl(var(--foreground))]">
            {category ? category.nama : "Memuat..."}
          </h1>
          {category?.formula?.description && (
            <p className="text-[12px] text-[hsl(var(--muted-foreground))]">Formula: {category.formula.description}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <LaporanFilter />
          {category?.parameters && category.parameters.filter((p) => p.isBaseline).length > 0 && (
            <button
              onClick={() => openDataDasarForm()}
              disabled={!category}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[11px] font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-50"
            >
              <Database className="w-3.5 h-3.5" /> Data Dasar
            </button>
          )}
          <button
            onClick={() => setShowCopyModal(true)}
            disabled={!category}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[11px] font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-50"
          >
            <Copy className="w-3.5 h-3.5" /> Salin
          </button>
          <button
            onClick={() => openForm()}
            disabled={!category}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] text-[11px] font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" /> Input Laporan
          </button>
        </div>
      </div>

      {/* ── Data Table (includes summary cards + tabbed sub-categories) ── */}
      {category && (
        <LaporanTable
          category={category}
          laporanList={laporanList}
          isLoading={isLoading}
          paginatedList={paginatedList}
          currentPage={currentPage}
          totalPages={totalPages}
          PAGE_SIZE={PAGE_SIZE}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          setCurrentPage={setCurrentPage}
          laporanCount={laporanList.length}
          puskesmasTotal={puskesmasList.length}
          categoryCode={categoryCode}
          bulan={bulan}
          tahun={tahun}
          onRowClick={(pkmId) => openForm(pkmId)}
          openForm={() => openForm()}
        />
      )}

      {/* ── Data Dasar Modal ── */}
      {showDataDasarForm && category && (
        <DataDasarModal
          open={showDataDasarForm}
          onClose={() => setShowDataDasarForm(false)}
          category={category}
          isOperator={isOperator}
          formPuskesmasId={formPuskesmasId}
          setFormPuskesmasId={setFormPuskesmasId}
          formValues={formValues}
          setFormValues={setFormValues}
          puskesmasList={puskesmasList}
          dataDasarList={dataDasarList}
          submitMutation={submitMutation}
          handleSubmit={handleSubmit}
        />
      )}

      {/* ── Input Form Modal ── */}
      {showForm && category && (
        <LaporanFormModal
          open={showForm}
          onClose={() => setShowForm(false)}
          category={category}
          isOperator={isOperator}
          formPuskesmasId={formPuskesmasId}
          setFormPuskesmasId={setFormPuskesmasId}
          formValues={formValues}
          setFormValues={setFormValues}
          puskesmasList={puskesmasList}
          laporanList={laporanList}
          submitMutation={submitMutation}
          handleSubmit={handleSubmit}
        />
      )}

      {/* ── Copy Template Modal ── */}
      {showCopyModal && (
        <CopyTemplateModal
          open={showCopyModal}
          onClose={() => setShowCopyModal(false)}
          categoryNama={category?.nama}
          isOperator={isOperator}
          copyPuskesmasId={copyPuskesmasId}
          setCopyPuskesmasId={setCopyPuskesmasId}
          copyBulanFrom={copyBulanFrom}
          setCopyBulanFrom={setCopyBulanFrom}
          copyTahunFrom={copyTahunFrom}
          setCopyTahunFrom={setCopyTahunFrom}
          bulan={bulan}
          tahun={tahun}
          puskesmasList={puskesmasList}
          copyMutation={copyMutation}
        />
      )}
    </div>
  );
}
