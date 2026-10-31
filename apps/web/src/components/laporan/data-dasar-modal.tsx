"use client";

import { Building2, Database, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";

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
      description={`${category.nama} • ${baselineParams.length} field baseline`}
      icon={<Database className="w-4.5 h-4.5" />}
      size="lg"
      variant="hero"
      footer={
        <>
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="rounded-full">
            Batal
          </Button>
          <Button
            type="submit"
            form="data-dasar-form"
            size="sm"
            disabled={submitMutation.isPending}
            className="rounded-full gap-2 shadow-subtle"
          >
            {submitMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {submitMutation.isPending ? "Menyimpan..." : "Simpan"}
          </Button>
        </>
      }
    >
      <form id="data-dasar-form" onSubmit={(e) => handleSubmit(e, true)} className="space-y-5">
        {!isOperator && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-card border border-border bg-surface shadow-subtle">
            <div className="w-9 h-9 rounded-xl bg-primary-subtle flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground mb-1">
                Puskesmas
              </p>
              <Select
                value={formPuskesmasId}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setFormPuskesmasId(id);
                  const existing = dataDasarList.find((l) => l.puskesmasId === id);
                  setFormValues(existing ? buildValueMapFromLaporan(existing.values) : {});
                }}
                className="w-full text-[13px] font-bold"
              >
                {puskesmasList.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.nama}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 max-h-[58vh] overflow-y-auto pr-1">
          {baselineParams.map((p, idx) => {
            const key = buildKey(p.id);
            const val = formValues[key] ?? "";
            return (
              <div
                key={p.id}
                className={`group flex items-center justify-between gap-6 px-4 py-3.5 rounded-card transition-all ${
                  val !== ""
                    ? "bg-primary-subtle border border-primary/25"
                    : "bg-surface border border-border/70 hover:border-border"
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-extrabold shrink-0 transition-colors ${
                      val !== "" ? "bg-primary text-primary-foreground" : "bg-surface-subtle text-muted-foreground"
                    }`}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[13px] font-bold text-foreground truncate">
                    {p.nama}
                    {p.required && <span className="text-[#E15A4F] ml-1">*</span>}
                  </span>
                </div>
                <Input
                  type={p.type === "NUMBER" ? "number" : "text"}
                  min={p.type === "NUMBER" ? 0 : undefined}
                  required={p.required}
                  value={val}
                  onChange={(e) => setFormValues((prev: ValueMap) => ({ ...prev, [key]: e.target.value }))}
                  placeholder="0"
                  className={`w-36 h-10 px-3 text-[15px] font-extrabold text-right tabular-nums rounded-button ${
                    val !== ""
                      ? "bg-surface border-primary/40 text-foreground"
                      : "bg-surface-subtle text-muted-foreground"
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
