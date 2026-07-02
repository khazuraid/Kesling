"use client";

import { Building2, FilePenLine, Send, ShieldCheck, X } from "lucide-react";
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

// ─── Component Props ───────────────────────────────────────────────────

interface LaporanFormModalProps {
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
  laporanList: DynamicLaporan[];
  submitMutation: { isPending: boolean; mutate: (body: any) => void };
  handleSubmit: (e: React.FormEvent, isDataDasar?: boolean, status?: string) => void;
}

export function LaporanFormModal({
  open,
  onClose,
  category,
  isOperator,
  formPuskesmasId,
  setFormPuskesmasId,
  formValues,
  setFormValues,
  puskesmasList,
  laporanList,
  submitMutation,
  handleSubmit,
}: LaporanFormModalProps) {
  const existingStatus = laporanList.find((l) => l.puskesmasId === formPuskesmasId)?.status;
  const reportParameters = category.parameters.filter(
    (p) => !p.isBaseline || p.type === "NUMBER" || p.type === "DECIMAL",
  );
  const activeIdx = 0;
  const scList = category.subCategories;
  const total = scList.length;

  const footer =
    !isOperator && existingStatus === "SUBMITTED" ? (
      <>
        <button
          type="button"
          onClick={onClose}
          className="h-9 px-5 bg-transparent text-[hsl(var(--muted-foreground))] rounded-full text-[11px] font-bold uppercase tracking-wider hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={(e) => handleSubmit(e, false, "REJECTED")}
          disabled={submitMutation.isPending}
          className="h-9 px-4 bg-transparent border border-[hsl(var(--error))] text-[hsl(var(--error))] text-[11px] font-bold uppercase tracking-wider hover:bg-[hsl(var(--error))]/10 transition-colors"
        >
          Tolak
        </button>
        <button
          type="button"
          onClick={(e) => handleSubmit(e, false, "APPROVED")}
          disabled={submitMutation.isPending}
          className="h-9 px-5 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] rounded-full text-[11px] font-bold uppercase tracking-wider hover:bg-[hsl(var(--accent))] hover:text-white transition-colors shadow-sm"
        >
          <ShieldCheck className="w-4 h-4" /> Setujui
        </button>
      </>
    ) : (
      <>
        <button
          type="button"
          onClick={onClose}
          className="h-9 px-5 bg-transparent text-[hsl(var(--muted-foreground))] rounded-full text-[11px] font-bold uppercase tracking-wider hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
        >
          <X className="w-3.5 h-3.5" /> Batal
        </button>
        <button
          type="button"
          onClick={(e) => handleSubmit(e, false, "DRAFT")}
          disabled={submitMutation.isPending}
          className="h-9 px-5 bg-transparent text-[hsl(var(--muted-foreground))] rounded-full text-[11px] font-bold uppercase tracking-wider hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
        >
          <FilePenLine className="w-3.5 h-3.5" /> Draft
        </button>
        <button
          type="submit"
          form="laporan-form"
          disabled={submitMutation.isPending}
          className="h-9 px-5 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] rounded-full text-[11px] font-bold uppercase tracking-wider hover:bg-[hsl(var(--accent))] hover:text-white transition-colors shadow-sm"
        >
          {submitMutation.isPending ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {submitMutation.isPending ? "Mengirim..." : "Kirim"}
        </button>
      </>
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={category.nama}
      description={
        category.isRowBased ? `${total} sub-kategori • ${activeIdx + 1}/${total}` : category.code.toUpperCase()
      }
      size="xl"
      footer={footer}
    >
      <form id="laporan-form" onSubmit={(e) => handleSubmit(e, false)} className="space-y-5">
        {/* Puskesmas selector card */}
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
                const existing = laporanList.find((l) => l.puskesmasId === id);
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

        {category.isRowBased ? (
          /* ── Matrix Table ── */
          <div className="rounded-lg border border-[hsl(var(--border))]/30 overflow-hidden shadow-sm">
            <div className="overflow-x-auto max-h-[55vh]">
              <table className="w-full border-collapse">
                {/* Sticky header */}
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[hsl(var(--muted))]/60 backdrop-blur-sm">
                    <th className="px-5 py-3.5 text-left text-[10px] font-extrabold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.15em] min-w-[220px] border-b border-[hsl(var(--border))]/40">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-5 bg-[hsl(var(--accent))] rounded-full"></span>
                        Sub-Kategori
                      </div>
                    </th>
                    {reportParameters.map((p, idx) => (
                      <th
                        key={p.id}
                        className={`px-5 py-3.5 text-center text-[10px] font-extrabold text-[hsl(var(--foreground))] uppercase tracking-[0.15em] w-36 border-b border-[hsl(var(--border))]/40 ${
                          idx === 0 ? "" : ""
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-[hsl(var(--accent))]/40"></span>
                          {p.nama}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scList.map((sc, rowIdx) => {
                    const hasAnyValue = reportParameters.some((p) => {
                      const key = buildKey(p.id, sc.id);
                      return (formValues[key] ?? "") !== "";
                    });
                    return (
                      <tr
                        key={sc.id}
                        className={`group transition-all duration-150 ${
                          rowIdx % 2 === 0 ? "bg-[hsl(var(--background))]" : "bg-[hsl(var(--muted))]/10"
                        } hover:bg-[hsl(var(--accent))]/5`}
                      >
                        <td className="px-5 py-3.5 border-b border-[hsl(var(--border))]/20">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                                hasAnyValue
                                  ? "bg-[hsl(var(--accent))]"
                                  : "bg-[hsl(var(--border))] group-hover:bg-[hsl(var(--accent))]/60"
                              }`}
                            ></span>
                            <div>
                              <span className="text-[13px] font-bold text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--accent))] transition-colors">
                                {sc.nama}
                              </span>
                              {sc.grup && (
                                <span className="ml-2 text-[9px] font-bold text-[hsl(var(--accent))] uppercase bg-[hsl(var(--accent))]/10 px-2 py-0.5 rounded-full">
                                  {sc.grup}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        {reportParameters.map((p) => {
                          const key = buildKey(p.id, sc.id);
                          const val = formValues[key] ?? "";
                          return (
                            <td key={p.id} className="px-5 py-2 border-b border-[hsl(var(--border))]/20">
                              <input
                                type={p.type === "NUMBER" ? "number" : "text"}
                                min={p.type === "NUMBER" ? 0 : undefined}
                                value={val}
                                onChange={(e) =>
                                  setFormValues((prev: ValueMap) => ({ ...prev, [key]: e.target.value }))
                                }
                                readOnly={p.isBaseline}
                                placeholder="—"
                                className={`w-full h-10 px-3 text-[13px] font-bold text-center tabular-nums rounded-lg outline-none transition-all duration-150 ${
                                  p.isBaseline
                                    ? "bg-[hsl(var(--muted))]/50 text-[hsl(var(--muted-foreground))]/40 cursor-not-allowed border border-dashed border-[hsl(var(--border))]/20"
                                    : val !== ""
                                      ? "bg-[hsl(var(--accent))]/5 border border-[hsl(var(--accent))]/30 text-[hsl(var(--foreground))] focus:bg-[hsl(var(--accent))]/10 focus:border-[hsl(var(--accent))] focus:shadow-[0_0_0_3px_hsl(var(--accent)/0.1)]"
                                      : "bg-transparent border border-transparent text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--border))]/40 hover:bg-[hsl(var(--muted))]/10 focus:border-[hsl(var(--accent))] focus:bg-[hsl(var(--background))] focus:shadow-[0_0_0_3px_hsl(var(--accent)/0.1)]"
                                }`}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Footer stat */}
            <div className="flex items-center justify-between px-5 py-3 bg-[hsl(var(--muted))]/30 border-t border-[hsl(var(--border))]/30">
              <span className="text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
                {category.subCategories.length} sub-kategori × {reportParameters.length} parameter
              </span>
              <span className="text-[11px] font-bold text-[hsl(var(--accent))] tabular-nums">
                {Object.values(formValues).filter((v) => v !== "" && v !== "0" && v !== "0.0").length} sel terisi
              </span>
            </div>
          </div>
        ) : (
          /* ── Card List ── */
          <div className="flex flex-col gap-2">
            {reportParameters.map((p, idx) => {
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
                    readOnly={p.isBaseline}
                    placeholder="0"
                    className={`w-36 h-10 px-3 text-[15px] font-extrabold text-right tabular-nums rounded-lg outline-none transition-all duration-150 ${
                      p.isBaseline
                        ? "bg-transparent text-[hsl(var(--muted-foreground))]/40 cursor-not-allowed border border-dashed border-[hsl(var(--border))]/20"
                        : val !== ""
                          ? "bg-[hsl(var(--accent))]/10 border border-[hsl(var(--accent))]/30 text-[hsl(var(--foreground))] focus:border-[hsl(var(--accent))] focus:shadow-[0_0_0_3px_hsl(var(--accent)/0.15)]"
                          : "bg-transparent border border-transparent text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]/20 focus:border-[hsl(var(--accent))] focus:bg-[hsl(var(--background))] focus:shadow-[0_0_0_3px_hsl(var(--accent)/0.1)]"
                    }`}
                  />
                </div>
              );
            })}
          </div>
        )}
      </form>
    </Modal>
  );
}

// ── Helper ──
function buildValueMapFromLaporan(values: DynamicLaporanValue[]): ValueMap {
  const map: ValueMap = {};
  for (const v of values) {
    map[buildKey(v.parameterId, v.subCategoryId)] = v.value;
  }
  return map;
}
