"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Info,
  Loader2,
  MapPin,
  Save,
  Upload,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { SignaturePad } from "@/components/ui/signature-pad";
import { toRoman } from "./helpers";

export function parseDropdownOptions(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x).trim()).filter(Boolean);
    } catch {
      // not JSON
    }
    return raw
      .split(/[,\n;]/)
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Kompresi foto sisi client sebelum diupload/disimpan
 * Mengubah gambar kamera 5-15MB menjadi ~150-250KB JPEG (1280px max, q=0.72)
 */
export function compressImage(
  file: File,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.72,
): Promise<{ dataUrl: string; sizeKb: number }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve({ dataUrl: "", sizeKb: 0 });
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => {
        const raw = String(reader.result || "");
        resolve({ dataUrl: raw, sizeKb: Math.round(raw.length / 1024) });
      };
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          const raw = String(reader.result || "");
          resolve({ dataUrl: raw, sizeKb: Math.round(raw.length / 1024) });
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        const sizeKb = Math.round((dataUrl.length * 3) / 4 / 1024);
        resolve({ dataUrl, sizeKb });
      };
      img.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });
}

export function isSignatureField(f: any): boolean {
  if (!f) return false;
  if (f.tipe === "SIGNATURE") return true;
  const p = (f.pertanyaan || "").toLowerCase();
  const g = (f.grup || "").toLowerCase();
  return (
    p.includes("tanda tangan") ||
    p.includes("ttd") ||
    g === "pengesahan" ||
    g === "tanda tangan" ||
    g.startsWith("pengesahan")
  );
}

export function isGolonganMatch(targetGolongan?: string | null, selectedGolongan?: string | null): boolean {
  if (!targetGolongan || targetGolongan === "ALL" || targetGolongan === "SEMUA" || targetGolongan === "KEDUANYA") {
    return true;
  }
  if (!selectedGolongan) {
    return true;
  }
  const cleanSelected = selectedGolongan.toLowerCase().replace(/[^a-z0-9]/g, "");
  const targets = targetGolongan
    .split(",")
    .map((t) => t.toLowerCase().replace(/[^a-z0-9]/g, ""))
    .filter(Boolean);
  return targets.some(
    (cleanTarget) =>
      cleanTarget === cleanSelected || cleanSelected.includes(cleanTarget) || cleanTarget.includes(cleanSelected),
  );
}

export function isFieldDisabledInfo(
  f: any,
  formValues: Record<number, any>,
  selectedGolongan: string,
  allFields: any[],
): { isDisabled: boolean; reason: string } {
  const conf =
    typeof f.config === "string"
      ? (() => {
          try {
            return JSON.parse(f.config);
          } catch {
            return {};
          }
        })()
      : f.config || {};

  // 1. Cek langsung properti disabled pada field atau config (dinonaktifkan di template)
  if (f.isDisabled || conf.isDisabled || conf.disabled || f.disabled || f.status === "DISABLED") {
    return {
      isDisabled: true,
      reason: "Butir ini dinonaktifkan di formulir (Tidak dinilai)",
    };
  }

  // 2. Cek targetGolongan sasaran
  const targetGol = conf.targetGolongan || f.targetGolongan || "ALL";
  const isTargetSpecific = targetGol && targetGol !== "ALL" && targetGol !== "SEMUA";
  if (isTargetSpecific && selectedGolongan && !isGolonganMatch(targetGol, selectedGolongan)) {
    return {
      isDisabled: true,
      reason: `Khusus ${targetGol} (Sasaran: ${selectedGolongan}) — Tidak dinilai`,
    };
  }

  // 3. Cek dependensi (dependsOn)
  const dep = conf.dependsOn || f.dependsOn;
  if (dep) {
    const parent = allFields.find(
      (p: any, idx: number) => p.id === dep.parentId || p.urutan === dep.parentIndex || idx === dep.parentIndex,
    );
    const parentVal = parent ? String(formValues[parent.id] ?? "").toUpperCase() : "";
    const reqVal = String(dep.requiredValue ?? "TRUE").toUpperCase();
    if (parentVal !== reqVal) {
      return {
        isDisabled: true,
        reason: `Menunggu butir "${parent?.pertanyaan || "pertanyaan sebelumnya"}" dijawab "${reqVal === "TRUE" ? "Ya" : "Tidak"}"`,
      };
    }
  }

  return { isDisabled: false, reason: "" };
}

interface FormViewProps {
  activeForm: any;
  editingId: number | null;
  formValues: Record<number, any>;
  metaValues: Record<number, any>;
  liveSkor: {
    gained: number;
    max: number;
    finalValue?: number;
    percentValue?: number;
    valueText: string;
    pass: boolean;
    text: string;
  };
  canSubmit: boolean;
  isPending: boolean;
  tanggalPemeriksaan: string;
  onBack: () => void;
  onFieldChange: (id: number, val: any) => void;
  onMetaChange: (id: number, val: any) => void;
  onGPS: (id: number) => void;
  onTanggalChange: (val: string) => void;
  onSubmit: () => void;
}

export function FormView({
  activeForm,
  editingId,
  formValues,
  metaValues,
  liveSkor,
  canSubmit,
  isPending,
  tanggalPemeriksaan,
  onBack,
  onFieldChange,
  onMetaChange,
  onGPS,
  onTanggalChange,
  onSubmit,
}: FormViewProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const metaFields = useMemo(() => activeForm.fields.filter((f: any) => f.grup === "__META__"), [activeForm.fields]);
  const penilaianFields = useMemo(
    () => activeForm.fields.filter((f: any) => f.grup !== "__META__"),
    [activeForm.fields],
  );

  const selectedGolongan = useMemo(() => {
    // Cek di metaValues dan formValues
    for (const f of activeForm.fields) {
      const val = String((f.grup === "__META__" ? metaValues[f.id] : formValues[f.id]) ?? "").trim();
      if (!val) continue;
      const q = (f.pertanyaan || "").toLowerCase();
      if (q.includes("golongan") || q.includes("tipe") || val.toLowerCase().includes("golongan")) {
        return val;
      }
    }
    return "";
  }, [activeForm.fields, metaValues, formValues]);

  // Kelompokkan area kuesioner menjadi langkah-langkah wizard
  const areaSteps = useMemo(() => {
    const areaMap = new Map<
      string,
      { area: string; areaIndex: number; groups: { grup: string; subbagian: string | null; fields: any[] }[] }
    >();
    const areaOrder: string[] = [];

    penilaianFields.forEach((f: any) => {
      const g = f.grup || "Instrumen Penilaian";
      const delimiterIndex = g.indexOf(" — ");
      const area = delimiterIndex >= 0 ? g.slice(0, delimiterIndex).trim() : g;
      const subbagian = delimiterIndex >= 0 ? g.slice(delimiterIndex + 3).trim() || null : null;

      let areaEntry = areaMap.get(area);
      if (!areaEntry) {
        areaOrder.push(area);
        areaEntry = {
          area,
          areaIndex: areaOrder.length,
          groups: [],
        };
        areaMap.set(area, areaEntry);
      }

      let groupEntry = areaEntry.groups.find((gr) => gr.grup === g);
      if (!groupEntry) {
        groupEntry = { grup: g, subbagian, fields: [] };
        areaEntry.groups.push(groupEntry);
      }
      groupEntry.fields.push(f);
    });

    return areaOrder
      .map((areaKey) => areaMap.get(areaKey))
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  }, [penilaianFields]);

  // Definisi struktur Langkah (Wizard Steps)
  // Step 0: Informasi Sasaran (jika ada field grup __META__)
  // Step 1..N: Bagian Area Penilaian sesuai format builder
  const steps = useMemo(() => {
    const s: {
      id: string;
      title: string;
      subtitle: string;
      badge: string;
      type: "meta" | "area";
      areaData?: (typeof areaSteps)[0];
    }[] = [];

    if (metaFields.length > 0) {
      s.push({
        id: "step-meta",
        title: "Identitas Sasaran",
        subtitle: "Data entitas & tanggal pemeriksaan",
        badge: "Info",
        type: "meta",
      });
    }

    areaSteps.forEach((as, idx) => {
      s.push({
        id: `step-area-${idx}`,
        title: as.area,
        subtitle: `${as.groups.reduce((acc, g) => acc + g.fields.length, 0)} Pertanyaan`,
        badge: toRoman(as.areaIndex),
        type: "area",
        areaData: as,
      });
    });

    if (s.length === 0) {
      s.push({
        id: "step-empty",
        title: "Formulir Pemeriksaan",
        subtitle: "Instrumen penilaian",
        badge: "1",
        type: "area",
      });
    }

    return s;
  }, [metaFields.length, areaSteps]);

  const currentStep = steps[currentStepIndex] || steps[0];

  // Hitung progres kelengkapan butir
  const completionStats = useMemo(() => {
    let totalQuestions = 0;
    let answeredQuestions = 0;

    penilaianFields.forEach((f: any) => {
      const disabledInfo = isFieldDisabledInfo(f, formValues, selectedGolongan, activeForm.fields);
      if (disabledInfo.isDisabled) return;
      totalQuestions++;
      const val = formValues[f.id];
      if (val !== null && val !== undefined && val !== "") {
        answeredQuestions++;
      }
    });

    const percentAnswered = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 100;
    return { totalQuestions, answeredQuestions, percentAnswered };
  }, [penilaianFields, formValues, selectedGolongan, activeForm.fields]);

  // Evaluasi skor persentase tampilan
  const displayPercentage = useMemo(() => {
    if (liveSkor.percentValue !== undefined) {
      return `${Math.round(liveSkor.percentValue * 10) / 10}%`;
    }
    if (liveSkor.valueText?.includes("%")) {
      return liveSkor.valueText;
    }
    const pct = liveSkor.max > 0 ? (liveSkor.gained / liveSkor.max) * 100 : 0;
    return `${Math.round(pct * 10) / 10}%`;
  }, [liveSkor]);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="w-full pb-20 fade-in">
      {/* ── STICKY TOP SCORE HUD ── */}
      <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-[#0C1B16]/95 backdrop-blur-md text-white border-b border-white/10 shadow-lg transition-all">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Back & Form Name */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0"
              title="Kembali"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#BEF264] px-2 py-0.5 rounded-full bg-[#BEF264]/15">
                  {editingId ? "Mode Edit" : "Inspeksi Lapangan"}
                </span>
                <span className="text-[11px] text-white/50 hidden sm:inline truncate">{activeForm.nama}</span>
              </div>
              <h2 className="text-[15px] sm:text-[17px] font-black tracking-tight truncate mt-0.5 text-white">
                {String(
                  Object.entries(metaValues).find(([fid]) => {
                    const f = activeForm.fields.find((field: any) => field.id === Number(fid));
                    return f?.pertanyaan?.toLowerCase().includes("nama");
                  })?.[1] || activeForm.nama,
                )}
              </h2>
            </div>
          </div>

          {/* Prominent Percentage Score HUD */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-3.5 py-1.5 rounded-2xl bg-white/[0.08] border border-white/10">
              <div className="text-right">
                <div className="flex items-baseline justify-end gap-1.5">
                  <span
                    className={`text-[20px] sm:text-[24px] font-black tracking-tight leading-none tabular-nums ${
                      liveSkor.pass ? "text-[#BEF264]" : "text-[#FF8D80]"
                    }`}
                  >
                    {displayPercentage}
                  </span>
                </div>
                <div className="text-[10px] text-white/60 font-semibold tabular-nums">
                  {liveSkor.gained} / {liveSkor.max} Poin
                </div>
              </div>

              {/* Status Badge */}
              <div className="hidden xs:flex flex-col items-start pl-2 border-l border-white/15">
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    liveSkor.pass ? "bg-[#00A876] text-white shadow-sm" : "bg-[#E15A4F] text-white shadow-sm"
                  }`}
                >
                  {liveSkor.pass ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  {liveSkor.text}
                </span>
                <span className="text-[9px] text-white/50 mt-0.5 pl-0.5">
                  {completionStats.answeredQuestions}/{completionStats.totalQuestions} Butir (
                  {completionStats.percentAnswered}%)
                </span>
              </div>
            </div>

            {/* Quick Action button on mobile */}
            {currentStepIndex === steps.length - 1 ? (
              <button
                onClick={onSubmit}
                disabled={!canSubmit || isPending}
                className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#BEF264] text-[#06281E] text-[13px] font-black hover:brightness-105 transition-all shadow-md disabled:opacity-40"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> {editingId ? "Update" : "Simpan"}
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[12px] font-bold transition-colors"
              >
                Lanjut <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="w-full bg-white/10 h-1 mt-2.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#00A876] to-[#BEF264] transition-all duration-300 rounded-full"
            style={{ width: `${completionStats.percentAnswered}%` }}
          />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-1 sm:px-0 pt-6">
        {/* ── STEP WIZARD NAVIGATION PILLS ── */}
        <div className="mb-6 overflow-x-auto pb-2 scrollbar-none">
          <div className="flex items-center gap-2 min-w-max">
            {steps.map((step, idx) => {
              const isActive = idx === currentStepIndex;
              const isPassed = idx < currentStepIndex;
              return (
                <button
                  key={step.id}
                  onClick={() => {
                    setCurrentStepIndex(idx);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[12px] font-bold transition-all border ${
                    isActive
                      ? "bg-[#0C1B16] text-white border-[#0C1B16] shadow-sm ring-2 ring-[#00A876]/30"
                      : isPassed
                        ? "bg-[#00A876]/10 text-[#00A876] border-[#00A876]/20 hover:bg-[#00A876]/20"
                        : "bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))] hover:border-[hsl(var(--foreground))]/40"
                  }`}
                >
                  <span
                    className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black ${
                      isActive
                        ? "bg-[#BEF264] text-[#06281E]"
                        : isPassed
                          ? "bg-[#00A876] text-white"
                          : "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                    }`}
                  >
                    {isPassed ? <Check className="w-3 h-3 stroke-[3]" /> : step.badge}
                  </span>
                  <span className="truncate max-w-[140px] sm:max-w-[200px]">{step.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── STEP CONTENT AREA ── */}
        <div className="space-y-6">
          {/* STEP 0: INFORMASI SASARAN */}
          {currentStep.type === "meta" && (
            <div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-[hsl(var(--border))] bg-gradient-to-r from-[hsl(var(--muted))]/60 to-transparent flex items-center justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00A876]/10 text-[#00A876] text-[10px] font-extrabold uppercase tracking-wider mb-1">
                    <FileText className="w-3 h-3" /> Langkah 1 dari {steps.length}
                  </div>
                  <h3 className="text-[18px] font-extrabold text-[hsl(var(--foreground))]">
                    Informasi Sasaran & Pelaksanaan
                  </h3>
                  <p className="text-[12px] text-[hsl(var(--muted-foreground))] mt-0.5">
                    Lengkapi identitas sasaran yang diperiksa dan tanggal pelaksanaan inspeksi kesehatan lingkungan.
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Tanggal Pemeriksaan */}
                <div className="rounded-2xl border border-[hsl(var(--border))] p-5 bg-[hsl(var(--background))]/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-bold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                      Tanggal Pemeriksaan <span className="text-[#E15A4F]">*</span>
                    </label>
                    <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Wajib diisi</span>
                  </div>
                  <input
                    type="date"
                    value={tanggalPemeriksaan}
                    onChange={(e) => onTanggalChange(e.target.value)}
                    className="w-full sm:max-w-xs h-11 border border-[hsl(var(--border))] rounded-xl bg-white dark:bg-zinc-900 px-3.5 text-[13px] font-medium outline-none focus:border-[#00A876] focus:ring-2 focus:ring-[#00A876]/20 transition-all shadow-sm"
                  />
                </div>

                {/* Metadata Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {metaFields.map((f: any) => {
                    const allFields = activeForm.fields || [];
                    const { isDisabled, reason: disabledReason } = isFieldDisabledInfo(
                      f,
                      metaValues,
                      selectedGolongan,
                      allFields,
                    );
                    return (
                      <div
                        key={f.id}
                        className={`rounded-2xl border border-[hsl(var(--border))] p-5 bg-[hsl(var(--background))]/50 transition-all ${
                          f.tipe === "TEXT" || f.tipe === "SIGNATURE" ? "md:col-span-2" : ""
                        }`}
                      >
                        <FieldInput
                          field={f}
                          value={metaValues[f.id] ?? ""}
                          onChange={(v) => onMetaChange(f.id, v)}
                          onGPS={() => onGPS(f.id)}
                          disabled={isDisabled}
                          disabledReason={disabledReason}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 1..N: BAGIAN AREA PENILAIAN */}
          {currentStep.type === "area" && currentStep.areaData && (
            <div className="space-y-6">
              <div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-[hsl(var(--border))] bg-gradient-to-r from-[#0C1B16]/5 to-transparent flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#0C1B16] text-[#BEF264] text-[13px] font-black shadow-sm">
                      {toRoman(currentStep.areaData.areaIndex)}
                    </span>
                    <div>
                      <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#00A876]">
                        Bagian Penilaian
                      </div>
                      <h3 className="text-[18px] font-extrabold text-[hsl(var(--foreground))]">
                        {currentStep.areaData.area}
                      </h3>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] px-3 py-1 rounded-full bg-[hsl(var(--muted))]">
                    {currentStep.areaData.groups.reduce((acc, g) => acc + g.fields.length, 0)} Butir
                  </span>
                </div>

                <div className="p-6 space-y-6">
                  {currentStep.areaData.groups.map((group) => (
                    <div key={group.grup} className="space-y-4">
                      {group.subbagian && (
                        <div className="flex items-center gap-2 pt-2 pb-1 border-b border-[hsl(var(--border))]">
                          <div className="w-1.5 h-4 rounded-full bg-[#00A876]" />
                          <h4 className="text-[13px] font-extrabold text-[hsl(var(--foreground))] uppercase tracking-wide">
                            {group.subbagian}
                          </h4>
                        </div>
                      )}

                      <div className="space-y-3">
                        {group.fields.map((f: any, idx: number) => {
                          const allFields = activeForm.fields || [];
                          const { isDisabled, reason: disabledReason } = isFieldDisabledInfo(
                            f,
                            formValues,
                            selectedGolongan,
                            allFields,
                          );

                          return (
                            <div
                              key={f.id}
                              className={`rounded-2xl border border-[hsl(var(--border))] p-5 bg-[hsl(var(--card))] hover:border-[#00A876]/40 transition-colors shadow-sm ${
                                isDisabled ? "opacity-60 bg-[hsl(var(--muted))]/20" : ""
                              }`}
                            >
                              <FieldInput
                                index={idx + 1}
                                field={f}
                                value={formValues[f.id] ?? null}
                                onChange={(v) => onFieldChange(f.id, v)}
                                onGPS={() => onGPS(f.id)}
                                disabled={isDisabled}
                                disabledReason={disabledReason}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Submit Final Action Card di Langkah Terakhir */}
          {currentStepIndex === steps.length - 1 && (
            <div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <div>
                <h5 className="text-[14px] font-bold text-[hsl(var(--foreground))]">Siap Menyimpan Pemeriksaan?</h5>
                <p className="text-[12px] text-[hsl(var(--muted-foreground))] mt-0.5">
                  {canSubmit
                    ? "Seluruh butir wajib telah lengkap. Klik tombol di samping untuk menyimpan hasil ke riwayat."
                    : "Masih terdapat butir bertanda bintang (*) yang belum diisi pada formulir."}
                </p>
              </div>

              <button
                type="button"
                onClick={onSubmit}
                disabled={!canSubmit || isPending}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#00A876] hover:bg-[#008f64] text-white text-[13px] font-black transition-all shadow-md hover:shadow-lg disabled:opacity-40 flex items-center justify-center gap-2 shrink-0"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> {editingId ? "Update Pemeriksaan" : "Simpan Pemeriksaan"}
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* ── BOTTOM STICKY NAVIGATION BAR ── */}
        <div className="mt-8 pt-5 border-t border-[hsl(var(--border))] flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[12px] font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-30 disabled:pointer-events-none shadow-sm"
          >
            <ChevronLeft className="w-4 h-4" /> Sebelumnya
          </button>

          <div className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] hidden sm:block text-center">
            Langkah {currentStepIndex + 1} dari {steps.length} ·{" "}
            <span className="text-[hsl(var(--foreground))] font-bold">{currentStep.title}</span>
          </div>

          {currentStepIndex < steps.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#0C1B16] text-[#BEF264] text-[12px] font-extrabold hover:bg-[#122820] transition-colors shadow-sm"
            >
              Selanjutnya <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSubmit}
              disabled={!canSubmit || isPending}
              className="flex items-center gap-2 px-7 py-2.5 rounded-2xl bg-[#00A876] text-white text-[12px] font-black hover:bg-[#008f64] transition-all shadow-sm disabled:opacity-40"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" /> Selesai & Simpan
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Field Input Component ──────────────────────────────────────────────

function FieldInput({
  index,
  field: f,
  value,
  onChange,
  onGPS,
  disabled = false,
  disabledReason = "",
}: {
  index?: number;
  field: any;
  value: any;
  onChange: (v: any) => void;
  onGPS: () => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [isCompressing, setIsCompressing] = useState(false);
  const [photoSizeKb, setPhotoSizeKb] = useState<number | null>(null);
  const hasValue = value !== null && value !== undefined && value !== "";

  return (
    <div className={`space-y-3 ${disabled ? "opacity-60" : ""}`}>
      {/* Label Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 flex-1">
          {index && (
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-[hsl(var(--muted))] text-[11px] font-black text-[hsl(var(--foreground))] shrink-0 mt-0.5">
              {index}
            </span>
          )}
          <div className="space-y-1 flex-1">
            <label
              className={`text-[13px] font-bold text-[hsl(var(--foreground))] leading-snug block ${
                disabled ? "line-through text-[hsl(var(--muted-foreground))]" : ""
              }`}
            >
              {f.pertanyaan}
              {f.isRequired && !disabled && <span className="ml-1 text-[#E15A4F] font-black">*</span>}
            </label>

            {/* Badges / Pill Contexts */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {(f.config?.autoFill === "USER_NAME" || f.pertanyaan?.toLowerCase().includes("pemeriksa")) && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00A876]/10 text-[#00A876] font-bold">
                  👤 Akun Pemeriksa
                </span>
              )}
              {(f.config?.autoFill === "USER_PUSKESMAS" ||
                f.pertanyaan?.toLowerCase().includes("wilayah") ||
                f.pertanyaan?.toLowerCase().includes("puskesmas")) && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 font-bold">
                  🏥 Wilayah Kerja
                </span>
              )}
              {f.config?.targetGolongan &&
                f.config?.targetGolongan !== "ALL" &&
                f.config?.targetGolongan !== "SEMUA" && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      f.config.targetGolongan === "A1" || f.config.targetGolongan === "Golongan A1"
                        ? "bg-amber-500/10 text-amber-800 border-amber-300"
                        : "bg-indigo-500/10 text-indigo-800 border-indigo-300"
                    }`}
                  >
                    🎯 Khusus{" "}
                    {f.config.targetGolongan === "A1"
                      ? "Golongan A1"
                      : f.config.targetGolongan === "A2"
                        ? "Golongan A2"
                        : f.config.targetGolongan}
                  </span>
                )}
              {disabled && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 font-bold border border-amber-300">
                  🚫 Tidak Dinilai
                </span>
              )}
            </div>
          </div>
        </div>

        {(f.config?.skor ?? 0) > 0 && !disabled && (
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-[#00A876]/10 text-[#00A876] whitespace-nowrap shrink-0">
            Bobot: {f.config.skor}
          </span>
        )}
      </div>

      {disabled && (
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50/90 border border-amber-200 text-[11px] text-amber-900 font-medium">
          <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>{disabledReason || "Butir ini tidak berlaku untuk golongan ini."}</span>
        </div>
      )}

      {/* Input by Type */}
      {(f.tipe === "SIGNATURE" || isSignatureField(f)) && (
        <div className="space-y-1 pt-1">
          <SignaturePad
            value={value}
            onChange={onChange}
            label={`Tanda Tangan ${f.pertanyaan}`}
            helperText="Goreskan tanda tangan jelas di atas garis"
          />
        </div>
      )}

      {f.tipe === "BOOLEAN" && !isSignatureField(f) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
          {/* Tombol YA (Emerald Modern) */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange("TRUE")}
            className={`h-11 px-4 rounded-xl text-[13px] font-bold border transition-all flex items-center justify-center gap-2 disabled:pointer-events-none disabled:opacity-50 ${
              String(value ?? "").toUpperCase() === "TRUE"
                ? "bg-[#00A876] text-white border-[#00A876] shadow-sm ring-2 ring-[#00A876]/30"
                : "bg-white dark:bg-zinc-900 border-[hsl(var(--border))] text-slate-700 dark:text-slate-200 hover:border-[#00A876]/60 hover:bg-[#00A876]/5"
            }`}
          >
            <Check className="w-4 h-4 stroke-[3]" /> Ya (Memenuhi)
          </button>

          {/* Tombol TIDAK (Soft Coral / Rose) */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange("FALSE")}
            className={`h-11 px-4 rounded-xl text-[13px] font-bold border transition-all flex items-center justify-center gap-2 disabled:pointer-events-none disabled:opacity-50 ${
              String(value ?? "").toUpperCase() === "FALSE"
                ? "bg-[#E15A4F] text-white border-[#E15A4F] shadow-sm ring-2 ring-[#E15A4F]/30"
                : "bg-white dark:bg-zinc-900 border-[hsl(var(--border))] text-slate-700 dark:text-slate-200 hover:border-[#E15A4F]/60 hover:bg-[#E15A4F]/5"
            }`}
          >
            <X className="w-4 h-4 stroke-[3]" /> Tidak
          </button>

          {/* Tombol T/A (Amber Soft) */}
          {(f.config?.allowNA || f.allowNA) && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange("NA")}
              className={`h-11 px-4 rounded-xl text-[12px] font-bold border transition-all flex items-center justify-center gap-1.5 col-span-2 sm:col-span-1 disabled:pointer-events-none disabled:opacity-50 ${
                String(value ?? "").toUpperCase() === "NA"
                  ? "bg-amber-500 text-white border-amber-500 shadow-sm ring-2 ring-amber-500/30"
                  : "bg-white dark:bg-zinc-900 border-[hsl(var(--border))] text-slate-600 dark:text-slate-300 hover:border-amber-400 hover:bg-amber-50/50"
              }`}
            >
              T/A (Tidak Ada)
            </button>
          )}
        </div>
      )}

      {f.tipe === "TEXT" && !isSignatureField(f) && (
        <textarea
          rows={3}
          disabled={disabled}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Tuliskan keterangan / uraian temuan..."
          className="w-full border border-[hsl(var(--border))] bg-white dark:bg-zinc-900 rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed outline-none focus:border-[#00A876] focus:ring-2 focus:ring-[#00A876]/20 transition-all resize-y disabled:bg-[hsl(var(--muted))]/30 disabled:cursor-not-allowed shadow-sm"
        />
      )}

      {f.tipe === "NUMBER" && (
        <input
          type="number"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="w-full max-w-[200px] h-11 border border-[hsl(var(--border))] bg-white dark:bg-zinc-900 rounded-xl px-3.5 text-[13px] font-medium tabular-nums outline-none focus:border-[#00A876] focus:ring-2 focus:ring-[#00A876]/20 transition-all shadow-sm"
        />
      )}

      {f.tipe === "DATE" && (
        <input
          type="date"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full max-w-[220px] h-11 border border-[hsl(var(--border))] bg-white dark:bg-zinc-900 rounded-xl px-3.5 text-[13px] font-medium outline-none focus:border-[#00A876] focus:ring-2 focus:ring-[#00A876]/20 transition-all shadow-sm"
        />
      )}

      {(f.tipe === "DROPDOWN" || f.tipe === "SELECT") && (
        <select
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-11 border border-[hsl(var(--border))] bg-white dark:bg-zinc-900 rounded-xl px-3.5 text-[13px] font-medium outline-none focus:border-[#00A876] focus:ring-2 focus:ring-[#00A876]/20 transition-all shadow-sm cursor-pointer"
        >
          <option value="">— Pilih Opsi —</option>
          {parseDropdownOptions(f.options || f.opsi || f.config?.options).map((opt: string) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )}

      {f.tipe === "GPS" && (
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={onGPS}
            className="h-11 px-4 rounded-xl border border-[hsl(var(--border))] bg-white dark:bg-zinc-900 hover:border-[#00A876] text-[12px] font-bold text-[hsl(var(--foreground))] transition-colors flex items-center gap-2 shadow-sm"
          >
            <MapPin className="w-4 h-4 text-[#00A876]" />
            {hasValue ? "Perbarui Koordinat" : "Ambil Lokasi GPS"}
          </button>
          {hasValue && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#00A876]/10 text-[#00A876] font-mono text-[11px] font-bold">
              <Check className="w-3.5 h-3.5" /> {value}
            </div>
          )}
        </div>
      )}

      {/* Mandatory Client-Side Compressed Photo */}
      {f.tipe === "PHOTO" && (
        <div className="space-y-2">
          {isCompressing ? (
            <div className="flex items-center gap-2.5 p-4 rounded-2xl border border-dashed border-[#00A876] bg-[#00A876]/5 text-[#00A876] text-[12px] font-bold animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              Mengompresi foto (mengurangi ukuran ke ~200KB)...
            </div>
          ) : hasValue ? (
            <div className="relative inline-block rounded-2xl overflow-hidden border border-[hsl(var(--border))] shadow-sm group">
              {/* biome-ignore lint/performance/noImgElement: user inspection photo preview */}
              <img src={value} className="w-48 h-36 object-cover" alt="Foto Inspeksi" />
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setPhotoSizeKb(null);
                }}
                className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-rose-600 text-white rounded-xl transition-colors shadow-md"
                title="Hapus foto"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold">
                {photoSizeKb ? `${photoSizeKb} KB (Terkompresi)` : "Foto Terlampir"}
              </div>
            </div>
          ) : (
            <label className="inline-flex items-center gap-2.5 h-11 px-5 rounded-2xl border-2 border-dashed border-[hsl(var(--border))] hover:border-[#00A876] bg-white dark:bg-zinc-900 cursor-pointer text-[12px] font-bold text-[hsl(var(--muted-foreground))] hover:text-[#00A876] transition-all shadow-sm">
              <Upload className="w-4 h-4" />
              Ambil / Pilih Foto (Auto Kompresi)
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setIsCompressing(true);
                    try {
                      const { dataUrl, sizeKb } = await compressImage(file);
                      if (dataUrl) {
                        onChange(dataUrl);
                        setPhotoSizeKb(sizeKb);
                      }
                    } finally {
                      setIsCompressing(false);
                    }
                  }
                }}
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}
