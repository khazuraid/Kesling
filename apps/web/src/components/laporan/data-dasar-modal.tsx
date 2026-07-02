"use client";

import { Building2, Database, Save } from "lucide-react";
import { Modal } from "@/components/ui/modal";

// ─── Types ────────────────────────────────────────────────────────────

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

function buildValueMapFromLaporan(values: DynamicLaporanValue[]): ValueMap {
  const map: ValueMap = {};
  for (const v of values) map[buildKey(v.parameterId, v.subCategoryId)] = v.value;
  return map;
}

// ─── Component Props ───────────────────────────────────────────────────

interface DataDasarModalProps {
  open: boolean;
  onClose: () => void;
  category: {
    id: number;
    nama: string;
    code: string;
    icon: string;
    isRowBased: boolean;
    parameters: DynamicParameter[];
    subCategories: DynamicSubCategory[];
  };
  isOperator: boolean;
  formPuskesmasId: number;
  setFormPuskesmasId: (id: number) => void;
  formValues: ValueMap;
  setFormValues: (values: ValueMap | ((prev: ValueMap) => ValueMap)) => void;
  puskesmasList: any[];
  dataDasarList: DynamicLaporan[];
  submitMutation: { isPending: boolean };
  handleSubmit: (e: React.FormEvent, isDataDasar?: boolean, status?: string) => void;
}

export function DataDasarModal({
  open,
  onClose,
  category,
  isOperator,
  formPuskesmasId,
  setFormPuskesmasId,
  formValues,
  setFormValues,
  puskesmasList,
  dataDasarList,
  submitMutation,
  handleSubmit,
}: DataDasarModalProps) {
  const baselineParams = category.parameters
    .filter((p) => p.isBaseline)
    .sort((a, b) => (a.urutan || 0) - (b.urutan || 0));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Data Dasar"
      description={`${category.nama} • ${baselineParams.length} field`}
      icon={<Database className="w-4 h-4" />}
      size="lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-5 bg-transparent text-[hsl(var(--muted-foreground))] rounded-full text-[11px] font-bold uppercase tracking-wider hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            form="data-dasar-form"
            disabled={submitMutation.isPending}
            className="h-9 px-5 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] rounded-full text-[11px] font-bold uppercase tracking-wider hover:bg-[hsl(var(--accent))] hover:text-white transition-colors shadow-sm"
          >
            {submitMutation.isPending ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {submitMutation.isPending ? "Menyimpan..." : "Simpan"}
          </button>
        </>
      }
    >
      <form id="data-dasar-form" onSubmit={(e) => handleSubmit(e, true)} className="space-y-5">
        {!isOperator && (
          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-[hsl(var(--accent))]/5 to-transparent border-l-2 border-[hsl(var(--accent))]">
            <div className="w-8 h-8 rounded-full bg-[hsl(var(--accent))]/10 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-[hsl(var(--accent))]" />
            </div>
            <select
              value={formPuskesmasId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setFormPuskesmasId(id);
                const existing = dataDasarList.find((l) => l.puskesmasId === id);
                setFormValues(existing ? buildValueMapFromLaporan(existing.values) : {});
              }}
              className="flex-1 h-9 bg-transparent border-0 text-[14px] font-bold text-[hsl(var(--foreground))] outline-none appearance-none cursor-pointer"
            >
              {puskesmasList.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.nama}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-2">
          {baselineParams.map((p, idx) => {
            const key = buildKey(p.id);
            const val = formValues[key] ?? "";
            return (
              <div
                key={p.id}
                className={`group flex items-center justify-between gap-6 px-4 py-3.5 rounded-lg transition-all duration-150 ${
                  p.isBaseline
                    ? "bg-[hsl(var(--muted))]/20 border border-dashed border-[hsl(var(--border))]/30"
                    : val !== ""
                      ? "bg-[hsl(var(--accent))]/5 border border-[hsl(var(--accent))]/20 hover:border-[hsl(var(--accent))]/40"
                      : "bg-[hsl(var(--background))] border border-transparent hover:border-[hsl(var(--border))]/40 hover:bg-[hsl(var(--muted))]/10"
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="w-7 h-7 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-[10px] font-bold text-[hsl(var(--muted-foreground))] shrink-0 group-hover:bg-[hsl(var(--accent))]/10 group-hover:text-[hsl(var(--accent))] transition-colors">
                    {idx + 1}
                  </span>
                  <span className="text-[13px] font-semibold text-[hsl(var(--foreground))] truncate">
                    {p.nama}
                    {p.required && <span className="text-[hsl(var(--error))] ml-1">*</span>}
                  </span>
                </div>
                <input
                  type={p.type === "NUMBER" ? "number" : "text"}
                  min={p.type === "NUMBER" ? 0 : undefined}
                  required={p.required}
                  value={val}
                  onChange={(e) => setFormValues((prev: ValueMap) => ({ ...prev, [key]: e.target.value }))}
                  placeholder="0"
                  className={`w-36 h-10 px-3 text-[15px] font-extrabold text-right tabular-nums rounded-lg outline-none transition-all duration-150 ${
                    val !== ""
                      ? "bg-[hsl(var(--accent))]/10 border border-[hsl(var(--accent))]/30 text-[hsl(var(--foreground))] focus:border-[hsl(var(--accent))] focus:shadow-[0_0_0_3px_hsl(var(--accent)/0.15)]"
                      : "bg-transparent border border-transparent text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]/20 focus:border-[hsl(var(--accent))] focus:bg-[hsl(var(--background))] focus:shadow-[0_0_0_3px_hsl(var(--accent)/0.1)]"
                  }`}
                />
              </div>
            );
          })}
        </div>
      </form>
    </Modal>
  );
}
