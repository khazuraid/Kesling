"use client";

import { Building2, FilePenLine, Loader2, Send, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

function buildValueMap(values: DynamicLaporanValue[]): ValueMap {
  const map: ValueMap = {};
  for (const v of values || []) {
    map[buildKey(v.parameterId, v.subCategoryId)] = v.value;
  }
  return map;
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
        <Button type="button" variant="outline" size="sm" onClick={onClose} className="rounded-full">
          Batal
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(e) => handleSubmit(e, false, "REJECTED")}
          disabled={submitMutation.isPending}
          className="rounded-full border-[#E15A4F]/40 text-[#E15A4F] hover:bg-[#E15A4F]/10 hover:text-[#E15A4F]"
        >
          Tolak
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={(e) => handleSubmit(e, false, "APPROVED")}
          disabled={submitMutation.isPending}
          className="rounded-full gap-2 shadow-subtle"
        >
          <ShieldCheck className="w-4 h-4" /> Setujui
        </Button>
      </>
    ) : (
      <>
        <div className="mr-auto text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] tabular-nums">
          {filledCount} / {totalCells} sel terisi
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onClose} className="rounded-full">
          Batal
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(e) => handleSubmit(e, false, "DRAFT")}
          disabled={submitMutation.isPending}
          className="rounded-full gap-2"
        >
          <FilePenLine className="w-3.5 h-3.5" /> Draft
        </Button>
        <Button
          type="submit"
          form="laporan-form"
          size="sm"
          disabled={submitMutation.isPending}
          className="rounded-full gap-2 shadow-subtle"
        >
          {submitMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          {submitMutation.isPending ? "Mengirim..." : "Kirim"}
        </Button>
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
      <form id="laporan-form" onSubmit={(e) => handleSubmit(e, false, "SUBMITTED")} className="space-y-5">
        {/* Puskesmas selector */}
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
                  const existing = laporanList.find((l) => l.puskesmasId === id);
                  setFormValues(existing ? buildValueMap(existing.values) : {});
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
            {existingStatus && (
              <Badge
                variant="outline"
                className="shrink-0 text-[10px] font-extrabold uppercase tracking-wider bg-primary-subtle text-primary border-primary/20"
              >
                {existingStatus}
              </Badge>
            )}
          </div>
        )}

        {category.isRowBased ? (
          /* ── Matrix Table ── */
          <div className="rounded-card border border-border bg-surface shadow-subtle overflow-hidden">
            <div className="overflow-x-auto max-h-[52vh]">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-surface border-b border-border">
                    <th className="px-5 py-3.5 text-left text-[10px] font-extrabold text-muted-foreground uppercase tracking-[0.15em] min-w-[220px]">
                      Sub-Kategori
                    </th>
                    {reportParameters.map((p) => (
                      <th
                        key={p.id}
                        className="px-5 py-3.5 text-center text-[10px] font-extrabold text-foreground uppercase tracking-[0.15em] w-36"
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
                      <tr key={sc.id} className="group transition-colors hover:bg-surface-subtle">
                        <td className="px-5 py-3 border-b border-border/50">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`w-1.5 h-6 rounded-full shrink-0 transition-colors ${
                                hasAnyValue ? "bg-primary" : "bg-border"
                              }`}
                            />
                            <div>
                              <span className="text-[13px] font-bold text-foreground">{sc.nama}</span>
                              {sc.grup && (
                                <span className="ml-2 text-[11px] font-bold text-primary uppercase bg-primary-subtle px-2 py-0.5 rounded-full">
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
                            <td key={p.id} className="px-4 py-2 border-b border-border/50">
                              <Input
                                type={p.type === "NUMBER" ? "number" : "text"}
                                min={p.type === "NUMBER" ? 0 : undefined}
                                value={val}
                                onChange={(e) =>
                                  setFormValues((prev: ValueMap) => ({ ...prev, [key]: e.target.value }))
                                }
                                placeholder="—"
                                className={`w-full h-10 px-3 text-[13px] font-bold text-center tabular-nums rounded-button ${
                                  val !== ""
                                    ? "bg-surface border-primary/40 text-foreground"
                                    : "bg-surface-subtle text-muted-foreground"
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
                  className={`group flex items-center justify-between gap-6 px-4 py-3.5 rounded-card transition-all ${
                    p.isBaseline
                      ? "bg-surface-subtle/50 border border-dashed border-border/40"
                      : val !== ""
                        ? "bg-primary-subtle border border-primary/25"
                        : "bg-surface border border-border/70 hover:border-border"
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-extrabold shrink-0 transition-colors ${
                        val !== "" && !p.isBaseline
                          ? "bg-primary text-primary-foreground"
                          : "bg-surface-subtle text-muted-foreground"
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
        )}
      </form>
    </Modal>
  );
}
