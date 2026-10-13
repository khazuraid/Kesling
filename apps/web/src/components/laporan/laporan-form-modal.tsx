"use client";

import { Building2, FilePenLine, Send, ShieldCheck } from "lucide-react";
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
  const scList = category.subCategories;
  const filledCount = Object.values(formValues).filter((v) => v !== "" && v !== "0" && v !== "0.0").length;
  const totalCells = category.isRowBased ? scList.length * reportParameters.length : reportParameters.length;

  const footer =
    !isOperator && existingStatus === "SUBMITTED" ? (
      <>
        <button
          type="button"
          onClick={onClose}
          className="h-10 px-5 rounded-full text-[11px] font-extrabold uppercase tracking-wider text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={(e) => handleSubmit(e, false, "REJECTED")}
          disabled={submitMutation.isPending}
          className="h-10 px-5 rounded-full border border-[#E15A4F]/40 text-[#E15A4F] text-[11px] font-extrabold uppercase tracking-wider hover:bg-[#E15A4F]/10 transition-colors disabled:opacity-50"
        >
          Tolak
        </button>
        <button
          type="button"
          onClick={(e) => handleSubmit(e, false, "APPROVED")}
          disabled={submitMutation.isPending}
          className="inline-flex items-center gap-2 h-10 px-6 rounded-full bg-[#BEF264] text-[#06281E] text-[11px] font-extrabold uppercase tracking-wider hover:brightness-95 transition disabled:opacity-50"
        >
          <ShieldCheck className="w-4 h-4" /> Setujui
        </button>
      </>
    ) : (
      <>
        <div className="mr-auto text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.15em] tabular-nums">
          {filledCount} / {totalCells} sel terisi
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-10 px-5 rounded-full text-[11px] font-extrabold uppercase tracking-wider text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={(e) => handleSubmit(e, false, "DRAFT")}
          disabled={submitMutation.isPending}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-full border border-[hsl(var(--border))] text-[hsl(var(--foreground))] text-[11px] font-extrabold uppercase tracking-wider hover:border-[#00A876] hover:text-[#00A876] transition-colors disabled:opacity-50"
        >
          <FilePenLine className="w-3.5 h-3.5" /> Draft
        </button>
        <button
          type="submit"
          form="laporan-form"
          disabled={submitMutation.isPending}
          className="inline-flex items-center gap-2 h-10 px-6 rounded-full bg-[#BEF264] text-[#06281E] text-[11px] font-extrabold uppercase tracking-wider hover:brightness-95 transition disabled:opacity-50"
        >
          {submitMutation.isPending ? (
            <span className="w-3.5 h-3.5 border-2 border-[#06281E]/30 border-t-[#06281E] rounded-full animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
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
        category.isRowBased
          ? `${scList.length} sub-kategori × ${reportParameters.length} parameter`
          : `${reportParameters.length} parameter • ${category.code.toUpperCase()}`
      }
      icon={<FilePenLine className="w-4.5 h-4.5" />}
      size="xl"
      variant="hero"
      footer={footer}
    >
      <form id="laporan-form" onSubmit={(e) => handleSubmit(e, false)} className="space-y-5">
        {/* Puskesmas selector */}
        {!isOperator && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            <div className="w-9 h-9 rounded-xl bg-[#00A876]/10 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-[#00A876]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                Puskesmas
              </p>
              <select
                value={formPuskesmasId}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setFormPuskesmasId(id);
                  const existing = laporanList.find((l) => l.puskesmasId === id);
                  setFormValues(existing ? buildValueMapFromLaporan(existing.values) : {});
                }}
                className="w-full h-7 bg-transparent border-0 text-[14px] font-bold text-[hsl(var(--foreground))] outline-none appearance-none cursor-pointer"
              >
                {puskesmasList.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.nama}
                  </option>
                ))}
              </select>
            </div>
            {existingStatus && (
              <span className="shrink-0 inline-flex items-center h-6 px-2.5 rounded-full bg-[#00A876]/10 text-[#00A876] text-[10px] font-extrabold uppercase tracking-wider">
                {existingStatus}
              </span>
            )}
          </div>
        )}

        {category.isRowBased ? (
          /* ── Matrix Table ── */
          <div className="rounded-2xl border border-[hsl(var(--border))] overflow-hidden">
            <div className="overflow-x-auto max-h-[52vh]">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[hsl(var(--card))]">
                    <th className="px-5 py-3.5 text-left text-[10px] font-extrabold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.15em] min-w-[220px] border-b border-[hsl(var(--border))]">
                      Sub-Kategori
                    </th>
                    {reportParameters.map((p) => (
                      <th
                        key={p.id}
                        className="px-5 py-3.5 text-center text-[10px] font-extrabold text-[hsl(var(--foreground))] uppercase tracking-[0.15em] w-36 border-b border-[hsl(var(--border))]"
                      >
                        {p.nama}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scList.map((sc) => {
                    const hasAnyValue = reportParameters.some((p) => {
                      const key = buildKey(p.id, sc.id);
                      return (formValues[key] ?? "") !== "";
                    });
                    return (
                      <tr key={sc.id} className="group transition-colors hover:bg-[#00A876]/[0.03]">
                        <td className="px-5 py-3 border-b border-[hsl(var(--border))]/50">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`w-1.5 h-6 rounded-full shrink-0 transition-colors ${
                                hasAnyValue ? "bg-[#00A876]" : "bg-[hsl(var(--border))]"
                              }`}
                            />
                            <div>
                              <span className="text-[13px] font-bold text-[hsl(var(--foreground))]">{sc.nama}</span>
                              {sc.grup && (
                                <span className="ml-2 text-[9px] font-bold text-[#00A876] uppercase bg-[#00A876]/10 px-2 py-0.5 rounded-full">
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
                            <td key={p.id} className="px-4 py-2 border-b border-[hsl(var(--border))]/50">
                              <input
                                type={p.type === "NUMBER" ? "number" : "text"}
                                min={p.type === "NUMBER" ? 0 : undefined}
                                value={val}
                                onChange={(e) =>
                                  setFormValues((prev: ValueMap) => ({ ...prev, [key]: e.target.value }))
                                }
                                readOnly={p.isBaseline}
                                placeholder="—"
                                className={`w-full h-10 px-3 text-[13px] font-bold text-center tabular-nums rounded-xl outline-none transition-all ${
                                  p.isBaseline
                                    ? "bg-[hsl(var(--muted))]/50 text-[hsl(var(--muted-foreground))]/40 cursor-not-allowed border border-dashed border-[hsl(var(--border))]/30"
                                    : val !== ""
                                      ? "bg-[#00A876]/[0.07] border border-[#00A876]/30 text-[hsl(var(--foreground))] focus:border-[#00A876] focus:shadow-[0_0_0_3px_rgba(0,168,118,0.12)]"
                                      : "bg-transparent border border-transparent text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--border))] focus:border-[#00A876] focus:bg-[hsl(var(--background))] focus:shadow-[0_0_0_3px_rgba(0,168,118,0.12)]"
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
                  className={`group flex items-center justify-between gap-6 px-4 py-3.5 rounded-2xl transition-all ${
                    p.isBaseline
                      ? "bg-[hsl(var(--muted))]/20 border border-dashed border-[hsl(var(--border))]/40"
                      : val !== ""
                        ? "bg-[#00A876]/[0.05] border border-[#00A876]/25"
                        : "bg-[hsl(var(--card))] border border-[hsl(var(--border))]/70 hover:border-[hsl(var(--border))]"
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-extrabold shrink-0 transition-colors ${
                        val !== "" && !p.isBaseline
                          ? "bg-[#00A876] text-white"
                          : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                      }`}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[13px] font-bold text-[hsl(var(--foreground))] truncate">
                      {p.nama}
                      {p.required && <span className="text-[#E15A4F] ml-1">*</span>}
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
                    className={`w-36 h-10 px-3 text-[15px] font-extrabold text-right tabular-nums rounded-xl outline-none transition-all ${
                      p.isBaseline
                        ? "bg-transparent text-[hsl(var(--muted-foreground))]/40 cursor-not-allowed border border-dashed border-[hsl(var(--border))]/30"
                        : val !== ""
                          ? "bg-[#00A876]/10 border border-[#00A876]/30 text-[hsl(var(--foreground))] focus:border-[#00A876] focus:shadow-[0_0_0_3px_rgba(0,168,118,0.15)]"
                          : "bg-transparent border border-transparent text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--border))] focus:border-[#00A876] focus:bg-[hsl(var(--background))] focus:shadow-[0_0_0_3px_rgba(0,168,118,0.12)]"
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
