"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Info,
  Loader2,
  MapPin,
  Save,
  Upload,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPicker } from "@/components/ui/map-picker";
import { Select } from "@/components/ui/select";
import { SignaturePad } from "@/components/ui/signature-pad";
import { Textarea } from "@/components/ui/textarea";
import { useInspectionDraft } from "@/hooks/use-inspection-draft";
import { photoSrc } from "@/lib/photo-url";
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

export function isSingleLineField(f: any): boolean {
  if (!f) return false;
  if (f.config?.multiline === true || f.multiline === true) return false;
  if (f.grup === "__META__") {
    const p = (f.pertanyaan || "").toLowerCase();
    if (p.includes("catatan") || p.includes("keterangan") || p.includes("uraian")) {
      return false;
    }
    return true;
  }
  const p = (f.pertanyaan || "").toLowerCase();
  if (
    f.config?.autoFill ||
    p.includes("nama") ||
    p.includes("wilayah") ||
    p.includes("puskesmas") ||
    p.includes("nip") ||
    p.includes("petugas") ||
    p.includes("pemeriksa") ||
    p.includes("kontak") ||
    p.includes("telepon") ||
    p.includes("jabatan") ||
    p.includes("no.") ||
    p.includes("nomor")
  ) {
    return true;
  }
  return false;
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

/**
 * Butir wajib yang masih kosong — dipakai untuk memberi tahu petugas APA yang
 * menahan tombol simpan, bukan sekadar bahwa ada yang kurang.
 *
 * Sengaja menghitung ulang dari data dan mencerminkan syarat `canSubmit` di
 * page.tsx apa adanya. Tanda bintang di label (`f.isRequired && …`) tidak selalu
 * sepakat dengan aturan itu pada data lama: bila isRequired bernilai null,
 * butir penilaian tetap divalidasi (`undefined === false` → false) namun
 * bintangnya tidak tampil — butir seperti itu yang paling membingungkan, dan
 * hanya bisa ditemukan dengan cara menghitung seperti di bawah.
 */
export function collectMissingRequired(
  activeForm: any,
  formValues: Record<number, any>,
  metaValues: Record<number, any>,
  selectedGolongan?: string | null,
): { id: number; pertanyaan: string; grup: string; isMeta: boolean }[] {
  const fields: any[] = activeForm?.fields || [];
  const missing: { id: number; pertanyaan: string; grup: string; isMeta: boolean }[] = [];

  for (const f of fields) {
    const isMeta = f.grup === "__META__";
    // Cermin cabang yang berbeda di canSubmit: meta memakai `!f.isRequired`,
    // butir penilaian memakai `=== false`.
    if (isMeta ? !f.isRequired : f.isRequired === false) continue;

    const values = isMeta ? metaValues : formValues;
    if (isFieldDisabledInfo(f, values, selectedGolongan || "", fields).isDisabled) continue;

    const val = values[f.id];
    let kosong: boolean;
    if (isMeta) {
      kosong = String(val ?? "").trim() === "";
    } else if (f.tipe === "MATRIX_AREA") {
      // `canSubmit` menganggap matriks terisi kecuali nilainya benar-benar null
      // (undefined lolos karena `undefined !== null`). Ditiru apa adanya agar
      // daftar ini tidak menuduh butir yang sebenarnya tidak menahan simpan.
      kosong = val === null;
    } else {
      kosong = val === null || val === undefined || val === "";
    }

    if (kosong) {
      missing.push({
        id: f.id,
        pertanyaan: f.pertanyaan || `Butir #${f.id}`,
        grup: f.grup || "",
        isMeta,
      });
    }
  }

  return missing;
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

  const { hasDraft, existingDraft, clearDraft } = useInspectionDraft({
    templateId: activeForm?.id,
    sasaranId: (metaValues as any)?.sasaranId ?? null,
    formValues,
    metaValues,
    enabled: !editingId,
  });

  const matrixColumns: { code: string; label: string }[] = useMemo(() => {
    const raw = activeForm?.config?.matrixColumns;
    if (Array.isArray(raw) && raw.length > 0) return raw;
    return [
      { code: "A", label: "Area luar bangunan" },
      { code: "B", label: "Area fasilitas karyawan" },
      { code: "C", label: "Area penerimaan bahan baku/kemasan" },
      { code: "D", label: "Area penyimpanan (bahan baku, ingredien, kemasan)" },
      { code: "E", label: "Area pengolahan (pemotongan, pencucian, pemasakan)" },
      { code: "F", label: "Area pengemasan/pemorsian" },
      { code: "G", label: "Area loading produk jadi" },
      { code: "H", label: "Area pencucian peralatan" },
    ];
  }, [activeForm?.config?.matrixColumns]);

  const hasMatrixField = useMemo(() => {
    return (activeForm?.fields || []).some((f: any) => f.tipe === "MATRIX_AREA");
  }, [activeForm?.fields]);

  const metaFields = useMemo(
    () => (activeForm?.fields || []).filter((f: any) => f.grup === "__META__"),
    [activeForm?.fields],
  );
  const penilaianFields = useMemo(
    () => (activeForm?.fields || []).filter((f: any) => f.grup !== "__META__"),
    [activeForm?.fields],
  );

  const selectedGolongan = useMemo(() => {
    // Cek di metaValues dan formValues
    for (const f of activeForm?.fields || []) {
      const val = String((f.grup === "__META__" ? metaValues[f.id] : formValues[f.id]) ?? "").trim();
      if (!val) continue;
      const q = (f.pertanyaan || "").toLowerCase();
      if (q.includes("golongan") || q.includes("tipe") || val.toLowerCase().includes("golongan")) {
        return val;
      }
    }
    return "";
  }, [activeForm?.fields, metaValues, formValues]);

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

  // Butir wajib yang masih kosong — sumber penjelasan saat simpan ditolak.
  const missingRequired = useMemo(
    () => collectMissingRequired(activeForm, formValues, metaValues, selectedGolongan),
    [activeForm, formValues, metaValues, selectedGolongan],
  );
  const missingIds = useMemo(() => new Set(missingRequired.map((m) => m.id)), [missingRequired]);

  // Langkah yang masih menyimpan butir wajib kosong, agar pil langkah bisa
  // menandainya dan petugas tak perlu menebak-nebak letaknya.
  const stepsWithMissing = useMemo(() => {
    const s = new Set<number>();
    if (missingRequired.some((m) => m.isMeta)) s.add(steps.findIndex((st) => st.type === "meta"));
    steps.forEach((st, idx) => {
      if (st.type !== "area" || !st.areaData) return;
      const ada = st.areaData.groups.some((g) => g.fields.some((f: any) => missingIds.has(f.id)));
      if (ada) s.add(idx);
    });
    s.delete(-1);
    return s;
  }, [missingRequired, missingIds, steps]);

  const [showMissing, setShowMissing] = useState(false);

  /** Pindah ke langkah yang memuat butir wajib kosong. */
  const gotoStepOf = (fieldId: number) => {
    const idx = steps.findIndex((st) => {
      if (st.type === "meta") {
        return (metaFields as any[]).some((f: any) => f.id === fieldId);
      }
      return Boolean(st.areaData?.groups.some((g) => g.fields.some((f: any) => f.id === fieldId)));
    });
    if (idx >= 0) {
      setCurrentStepIndex(idx);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setShowMissing(false);
  };

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
    <div className="w-full px-4 sm:px-6 pb-28 sm:pb-20 fade-in">
      {/* Insets horizontal dipegang root ini (px-4 sm:px-6). Bilah di bawah
          memakai -mx-4 sm:-mx-6 untuk bleed sampai tepi viewport; tanpa px di
          root, bleed itu melebar 32px melewati layar dan memicu scroll
          horizontal di mobile. */}
      {/* ── STICKY TOP SCORE HUD (Clean & Compact) ── */}
      <div className="sticky top-14 md:top-16 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 sm:py-2.5 bg-surface/95 backdrop-blur-md text-foreground border-b border-border shadow-subtle transition-all">
        <div className="max-w-6xl mx-auto flex flex-col gap-1.5 sm:gap-0 sm:flex-row sm:items-center sm:justify-between">
          {/* Main Row */}
          <div className="flex items-center justify-between gap-2.5 sm:gap-3 min-w-0">
            {/* Back & Form Name */}
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
              <Button
                variant="outline"
                size="icon"
                onClick={onBack}
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl shrink-0"
                title="Kembali"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-primary px-1.5 sm:px-2 py-0.5 bg-primary-subtle border-primary/20 shrink-0"
                  >
                    {editingId ? "Mode Edit" : "Inspeksi Lapangan"}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground hidden md:inline truncate">{activeForm.nama}</span>
                </div>
                <h2 className="text-[13px] sm:text-[17px] font-black tracking-tight truncate mt-0.5 text-foreground max-w-[200px] sm:max-w-sm">
                  {String(
                    Object.entries(metaValues).find(([fid]) => {
                      const f = activeForm.fields.find((field: any) => field.id === Number(fid));
                      return f?.pertanyaan?.toLowerCase().includes("nama");
                    })?.[1] || activeForm.nama,
                  )}
                </h2>
              </div>
            </div>

            {/* Mobile Score & Status Pill */}
            <div className="flex sm:hidden items-center gap-1.5 shrink-0">
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-xl text-white font-extrabold shadow-xs ${
                  liveSkor.pass ? "bg-primary" : "bg-error"
                }`}
                title={liveSkor.text}
              >
                <span className="text-[13px] tabular-nums leading-none">{displayPercentage}</span>
                <span className="text-[11px] opacity-90">{liveSkor.pass ? "MS" : "TMS"}</span>
              </div>
            </div>
          </div>

          {/* Mobile Secondary Row: Compact Progress Info */}
          <div className="flex sm:hidden items-center justify-between text-[11px] text-muted-foreground font-semibold px-0.5">
            <span className="truncate max-w-[190px]">
              Langkah {currentStepIndex + 1}/{steps.length} · {currentStep.title}
            </span>
            <span className="tabular-nums shrink-0">
              {completionStats.answeredQuestions}/{completionStats.totalQuestions} ({completionStats.percentAnswered}%)
            </span>
          </div>

          {/* Desktop Prominent Percentage Score HUD */}
          <div className="hidden sm:flex items-center gap-2 sm:gap-4 shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-2xl bg-muted/60 border border-border">
              <div className="text-right">
                <div className="flex items-baseline justify-end gap-1">
                  <span
                    className={`text-[18px] sm:text-[24px] font-black tracking-tight leading-none tabular-nums ${
                      liveSkor.pass ? "text-primary" : "text-error"
                    }`}
                  >
                    {displayPercentage}
                  </span>
                </div>
                <div className="text-[11px] sm:text-[10px] text-muted-foreground font-semibold tabular-nums">
                  {liveSkor.gained} / {liveSkor.max} Poin
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex flex-col items-start pl-2 border-l border-border">
                <span
                  className={`inline-flex items-center gap-1 text-[11px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    liveSkor.pass ? "bg-primary text-white shadow-xs" : "bg-error text-white shadow-xs"
                  }`}
                >
                  {liveSkor.pass ? (
                    <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  ) : (
                    <AlertCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  )}
                  <span className="truncate max-w-[85px] sm:max-w-none">{liveSkor.text}</span>
                </span>
                <span className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 pl-0.5">
                  {completionStats.answeredQuestions}/{completionStats.totalQuestions} (
                  {completionStats.percentAnswered}%)
                </span>
              </div>
            </div>

            {/* Quick Action button on desktop */}
            {currentStepIndex === steps.length - 1 ? (
              <button
                onClick={onSubmit}
                disabled={!canSubmit || isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-[13px] font-black hover:bg-primary-hover transition-all shadow-subtle disabled:opacity-40"
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
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface border border-border hover:bg-muted text-foreground text-[12px] font-bold transition-colors shadow-xs"
              >
                Lanjut <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="w-full bg-muted h-1 mt-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 rounded-full"
            style={{ width: `${completionStats.percentAnswered}%` }}
          />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-0 sm:px-0 pt-3 sm:pt-6">
        {/* ── STEP WIZARD NAVIGATION PILLS ── */}
        <div className="mb-3 sm:mb-6 overflow-x-auto pb-1.5 sm:pb-2 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-max">
            {steps.map((step, idx) => {
              const isActive = idx === currentStepIndex;
              const isPassed = idx < currentStepIndex;
              const hasMissing = stepsWithMissing.has(idx);
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    setCurrentStepIndex(idx);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className={`relative flex items-center gap-1.5 sm:gap-2 min-h-[44px] px-3 sm:px-4 py-2 sm:py-2.5 rounded-card text-[12px] font-bold transition-all border shrink-0 ${
                    isActive
                      ? "bg-primary text-white border-primary shadow-subtle ring-2 ring-primary/20"
                      : isPassed
                        ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                        : "bg-surface text-muted-foreground border-border hover:border-foreground/40 shadow-subtle"
                  }`}
                >
                  <span
                    className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black shrink-0 ${
                      isActive
                        ? "bg-white text-primary"
                        : isPassed
                          ? "bg-[#00A876] text-white"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isPassed ? <Check className="w-3 h-3 stroke-[3]" /> : step.badge}
                  </span>
                  <span className="truncate max-w-[140px] sm:max-w-[200px]">{step.title}</span>
                  {hasMissing && (
                    <>
                      <span
                        aria-hidden="true"
                        title="Ada butir wajib yang belum diisi pada bagian ini"
                        className="w-2 h-2 rounded-full bg-error shrink-0 ring-2 ring-surface"
                      />
                      <span className="sr-only">(ada butir wajib yang belum diisi)</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── STEP CONTENT AREA ── */}
        <div className="space-y-6">
          {/* Offline Draft Recovery Notice */}
          {hasDraft && existingDraft && !editingId && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-card bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 shadow-subtle">
              <div className="flex items-center gap-2.5">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Ditemukan draf inspeksi offline dari perangkat ini (
                  {new Date(existingDraft.updatedAt).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  ). Pulihkan draf untuk melanjutkan pengisian?
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (existingDraft.formValues) {
                      for (const [k, v] of Object.entries(existingDraft.formValues)) {
                        onFieldChange(Number(k), v);
                      }
                    }
                    if (existingDraft.metaValues) {
                      for (const [k, v] of Object.entries(existingDraft.metaValues)) {
                        onMetaChange(Number(k), v);
                      }
                    }
                    clearDraft();
                  }}
                  className="h-8 px-3 rounded-button bg-amber-600 hover:bg-amber-700 text-white font-bold transition shadow-xs cursor-pointer"
                >
                  Pulihkan Draf
                </button>
                <button
                  type="button"
                  onClick={clearDraft}
                  className="h-8 px-2.5 rounded-button text-muted-foreground hover:bg-muted transition cursor-pointer"
                >
                  Abaikan
                </button>
              </div>
            </div>
          )}

          {/* STEP 0: INFORMASI SASARAN */}
          {currentStep.type === "meta" && (
            <div className="rounded-card border border-border bg-surface shadow-subtle overflow-hidden">
              <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-border bg-surface-subtle flex items-center justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-extrabold uppercase tracking-wider mb-1">
                    <FileText className="w-3 h-3" /> Langkah 1 dari {steps.length}
                  </div>
                  <h3 className="text-[17px] sm:text-[18px] font-extrabold text-foreground">
                    Informasi Sasaran & Pelaksanaan
                  </h3>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    Lengkapi identitas sasaran yang diperiksa dan tanggal pelaksanaan inspeksi kesehatan lingkungan.
                  </p>
                </div>
              </div>

              <div className="p-5 sm:p-6 space-y-6">
                {/* Tanggal Pemeriksaan */}
                <div className="rounded-card border border-border p-4 sm:p-5 bg-surface-subtle space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
                      Tanggal Pemeriksaan <span className="text-[#E15A4F]">*</span>
                    </label>
                    <span className="text-[11px] text-muted-foreground">Wajib diisi</span>
                  </div>
                  <input
                    type="date"
                    value={tanggalPemeriksaan}
                    onChange={(e) => onTanggalChange(e.target.value)}
                    className="w-full sm:max-w-xs h-11 border border-border rounded-xl bg-surface px-3.5 text-[13px] font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-subtle"
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
                        className={`rounded-card border border-border p-4 sm:p-5 bg-surface-subtle transition-all ${
                          (!isSingleLineField(f) && f.tipe === "TEXT") || f.tipe === "SIGNATURE" ? "md:col-span-2" : ""
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
              <div className="rounded-card border border-border bg-surface shadow-subtle overflow-hidden">
                <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-border bg-surface-subtle flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white text-[13px] font-black shadow-subtle">
                      {toRoman(currentStep.areaData.areaIndex)}
                    </span>
                    <div>
                      <div className="text-[10px] font-extrabold uppercase tracking-widest text-primary">
                        Bagian Penilaian
                      </div>
                      <h3 className="text-[17px] sm:text-[18px] font-extrabold text-foreground">
                        {currentStep.areaData.area}
                      </h3>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-muted-foreground px-3 py-1 rounded-full bg-surface border border-border">
                    {currentStep.areaData.groups.reduce((acc, g) => acc + g.fields.length, 0)} Butir
                  </span>
                </div>

                {/* Banner Panduan jika terdapat butir MATRIX_AREA */}
                {hasMatrixField && (
                  <div className="mx-5 sm:mx-6 mt-5 p-3.5 rounded-xl border border-primary/20 bg-primary-subtle/30 space-y-2 text-[11px]">
                    <div className="flex items-center gap-2 text-primary font-bold">
                      <Info className="w-4 h-4 shrink-0" />
                      <span>Instruksi Penilaian Matriks Multi-Area:</span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      Lingkari atau sentuh pada angka di kolom area inspeksi jika kriteria/persyaratan{" "}
                      <strong className="text-rose-600 font-black">TIDAK TERPENUHI</strong>. Area dengan tanda{" "}
                      <strong>NA</strong> tidak dinilai.
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 border-t border-primary/10 text-[10px] text-muted-foreground font-medium">
                      {matrixColumns.map((c) => (
                        <span key={c.code} className="inline-flex items-center gap-1">
                          <strong className="text-foreground font-black">{c.code}:</strong> {c.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-5 sm:p-6 space-y-6">
                  {currentStep.areaData.groups.map((group) => (
                    <div key={group.grup} className="space-y-4">
                      {group.subbagian && (
                        <div className="flex items-center gap-2 pt-2 pb-1 border-b border-border">
                          <div className="w-1.5 h-4 rounded-full bg-primary" />
                          <h4 className="text-[13px] font-extrabold text-foreground uppercase tracking-wide">
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
                              className={`rounded-card border border-border p-4 sm:p-5 bg-surface hover:border-primary/40 transition-colors shadow-subtle ${
                                isDisabled ? "opacity-60 bg-surface-subtle" : ""
                              }`}
                            >
                              <FieldInput
                                index={idx + 1}
                                field={f}
                                columns={matrixColumns}
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
            <div className="space-y-3">
              <div className="rounded-card border border-border bg-surface p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-subtle">
                <div className="w-full sm:w-auto">
                  <h5 className="text-[14px] font-bold text-foreground">Siap Menyimpan Pemeriksaan?</h5>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    {canSubmit ? (
                      "Seluruh butir wajib telah lengkap. Klik tombol di samping untuk menyimpan hasil ke riwayat."
                    ) : (
                      <>
                        Masih terdapat{" "}
                        <strong className="text-error font-bold">{missingRequired.length} butir wajib</strong> yang
                        belum diisi.
                        <button
                          type="button"
                          onClick={() => setShowMissing((v) => !v)}
                          className="ml-1 text-primary hover:underline font-bold inline-flex items-center gap-0.5"
                        >
                          {showMissing ? "Sembunyikan daftar" : "Lihat butir yang kurang"}
                        </button>
                      </>
                    )}
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={onSubmit}
                  disabled={!canSubmit || isPending}
                  className="w-full sm:w-auto h-11 px-7 rounded-xl text-[13px] font-black shrink-0"
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
                </Button>
              </div>

              {/* Daftar butir wajib yang belum diisi — bisa diklik untuk langsung loncat ke langkahnya */}
              {!canSubmit && showMissing && missingRequired.length > 0 && (
                <div className="rounded-card border border-error/30 bg-error-light/60 p-4 sm:p-5 space-y-2.5">
                  <div className="flex items-center gap-2 text-error font-bold text-[12px]">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Lengkapi butir berikut sebelum menyimpan:</span>
                  </div>
                  <ul className="divide-y divide-error/15 text-[12px]">
                    {missingRequired.map((m) => (
                      <li key={m.id} className="py-2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="font-semibold text-foreground block truncate">{m.pertanyaan}</span>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold block truncate">
                            {m.isMeta ? "Identitas Sasaran" : m.grup || "Penilaian"}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => gotoStepOf(m.id)}
                          className="h-8 px-3 text-[11px] font-bold text-primary shrink-0"
                        >
                          Buka Butir →
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── BOTTOM STICKY NAVIGATION BAR ── */}
        <div className="fixed sm:static bottom-0 left-0 right-0 z-30 sm:z-auto bg-surface/95 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t border-border p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:p-0 sm:pt-5 sm:mt-8 flex items-center justify-between gap-3 shadow-lg sm:shadow-none">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className="flex-1 sm:flex-initial h-11 sm:h-10 px-4 sm:px-5 rounded-xl text-[12px] font-bold"
          >
            <ChevronLeft className="w-4 h-4" /> Sebelumnya
          </Button>

          <div className="text-[11px] font-semibold text-muted-foreground hidden md:block text-center truncate max-w-xs">
            Langkah {currentStepIndex + 1} dari {steps.length} ·{" "}
            <span className="text-foreground font-bold">{currentStep.title}</span>
          </div>

          {currentStepIndex < steps.length - 1 ? (
            <Button
              type="button"
              onClick={handleNext}
              className="flex-1 sm:flex-initial h-11 sm:h-10 px-5 sm:px-6 rounded-xl text-[12px] font-extrabold"
            >
              Selanjutnya <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={onSubmit}
              disabled={!canSubmit || isPending}
              className="flex-1 sm:flex-initial h-11 sm:h-10 px-5 sm:px-7 rounded-xl text-[12px] font-black"
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
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Field Input Component ──────────────────────────────────────────────

function normalizeMatrixSelected(val: any): string[] {
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === "string" && val.trim()) {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {}
    return val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function MatrixAreaInput({
  field: f,
  columns,
  selectedCodes,
  onChange,
  disabled,
}: {
  field: any;
  columns: { code: string; label: string }[];
  selectedCodes: string[];
  onChange: (codes: string[]) => void;
  disabled?: boolean;
}) {
  const conf = typeof f.config === "object" && f.config ? f.config : {};
  const areaScores: Record<string, number | string> = conf.areaScores || {};
  const selectedSet = new Set(selectedCodes);

  const toggleCode = (code: string) => {
    if (disabled) return;
    const score = areaScores[code];
    if (score === "NA" || score === undefined) return;
    const next = new Set(selectedSet);
    if (next.has(code)) {
      next.delete(code);
    } else {
      next.add(code);
    }
    onChange(Array.from(next));
  };

  const clearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  const violatedCount = selectedCodes.length;

  return (
    <div className="space-y-2 pt-1">
      {/* Mobile & Desktop Header: SubNomor, Info & Quick Reset */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-[11px]">
        <div className="flex items-center gap-1.5 flex-wrap">
          {conf.subNomor && (
            <span className="px-2 py-0.5 rounded-md bg-muted text-foreground font-black text-[10px] tracking-wide border border-border">
              Sub #{conf.subNomor}
            </span>
          )}
          <span className="text-muted-foreground text-[10px]">
            *Sentuh angka jika area <strong className="text-rose-600 font-bold">TIDAK MEMENUHI</strong>
          </span>
        </div>
        {violatedCount > 0 && !disabled && (
          <button
            type="button"
            onClick={clearAll}
            className="text-[10px] font-bold text-muted-foreground hover:text-foreground px-2 py-0.5 rounded border border-border bg-surface transition-colors"
          >
            Bersihkan ({violatedCount} Pelanggaran)
          </button>
        )}
      </div>

      {/* Grid Kolom Area */}
      <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-8 gap-1.5">
        {columns.map((col) => {
          const rawScore = areaScores[col.code];
          const isNA = rawScore === "NA" || rawScore === undefined;
          const isViolated = selectedSet.has(col.code);
          const scoreNum = !isNA ? Number(rawScore) || 1 : null;

          return (
            <button
              key={col.code}
              type="button"
              disabled={disabled || isNA}
              onClick={() => toggleCode(col.code)}
              title={`${col.code}: ${col.label}${isNA ? " (Tidak Berlaku)" : ` (Penalti: ${scoreNum})`}`}
              className={`group/btn relative flex flex-col items-center justify-center p-2 rounded-xl border transition-all select-none ${
                isNA
                  ? "bg-muted/40 border-dashed border-border/60 text-muted-foreground/40 cursor-not-allowed opacity-50"
                  : isViolated
                    ? "bg-rose-600 border-rose-500 text-white shadow-md ring-2 ring-rose-400/50 scale-[1.02] cursor-pointer"
                    : "bg-surface border-border hover:border-primary/60 text-foreground cursor-pointer hover:bg-surface-subtle"
              }`}
            >
              {/* Kode Kolom */}
              <span
                className={`text-[11px] font-black uppercase tracking-wider ${
                  isViolated ? "text-rose-100" : isNA ? "text-muted-foreground/50" : "text-muted-foreground"
                }`}
              >
                {col.code}
              </span>

              {/* Nilai / Lingkaran */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-black mt-0.5 transition-transform ${
                  isNA
                    ? "text-[10px] text-muted-foreground/40"
                    : isViolated
                      ? "bg-white text-rose-700 font-black shadow-inner"
                      : "border border-border/80 text-foreground group-hover/btn:border-primary"
                }`}
              >
                {isNA ? "NA" : scoreNum}
              </div>

              {/* Status Ringkas */}
              <span
                className={`text-[10px] font-bold mt-0.5 truncate max-w-full px-0.5 ${
                  isViolated ? "text-rose-100" : "text-muted-foreground/60"
                }`}
              >
                {isViolated ? "TMS" : isNA ? "—" : "MS"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FieldInput({
  index,
  field: f,
  columns = [],
  value,
  onChange,
  onGPS,
  disabled = false,
  disabledReason = "",
}: {
  index?: number;
  field: any;
  columns?: { code: string; label: string }[];
  value: any;
  onChange: (v: any) => void;
  onGPS: () => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [isCompressing, setIsCompressing] = useState(false);
  const [photoSizeKb, setPhotoSizeKb] = useState<number | null>(null);
  const hasValue = value !== null && value !== undefined && value !== "";
  // Nilai dari DB bisa berupa URL absolut atau path tanpa garis miring depan;
  // keduanya dijawab 400 kalau diteruskan apa adanya sebagai src.
  const photoPreview = f.tipe === "PHOTO" ? photoSrc(value) : null;

  return (
    <div className={`space-y-3 ${disabled ? "opacity-60" : ""}`}>
      {/* Label Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          {index && (
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-muted text-[11px] font-black text-foreground shrink-0 mt-0.5">
              {index}
            </span>
          )}
          <div className="space-y-1 flex-1 min-w-0">
            <label
              className={`text-[13px] font-bold text-foreground leading-snug block ${
                disabled ? "line-through text-muted-foreground" : ""
              }`}
            >
              {f.pertanyaan}
              {f.isRequired && !disabled && <span className="ml-1 text-[#E15A4F] font-black">*</span>}
            </label>

            {/* Badges / Pill Contexts */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {(f.config?.autoFill === "USER_NAME" || f.pertanyaan?.toLowerCase().includes("pemeriksa")) && (
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary">
                  👤 Akun Pemeriksa
                </Badge>
              )}
              {(f.config?.autoFill === "USER_PUSKESMAS" ||
                f.pertanyaan?.toLowerCase().includes("wilayah") ||
                f.pertanyaan?.toLowerCase().includes("puskesmas")) && (
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-600">
                  🏥 Wilayah Kerja
                </Badge>
              )}
              {f.config?.targetGolongan &&
                f.config?.targetGolongan !== "ALL" &&
                f.config?.targetGolongan !== "SEMUA" && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-2 py-0.5 font-bold ${
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
                  </Badge>
                )}
              {disabled && (
                <Badge variant="warning" className="text-[10px] px-2 py-0.5 font-bold">
                  🚫 Tidak Dinilai
                </Badge>
              )}
            </div>
          </div>
        </div>

        {(f.config?.skor ?? 0) > 0 && !disabled && (
          <Badge
            variant="outline"
            className="text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 bg-primary/10 text-primary whitespace-nowrap shrink-0 border-primary/20"
          >
            Bobot: {f.config.skor}
          </Badge>
        )}
      </div>

      {disabled && (
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50/90 border border-amber-200 text-[11px] text-amber-900 font-medium">
          <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>{disabledReason || "Butir ini tidak berlaku untuk golongan ini."}</span>
        </div>
      )}

      {/* Input by Type */}
      {f.tipe === "MATRIX_AREA" && (
        <MatrixAreaInput
          field={f}
          columns={columns}
          selectedCodes={normalizeMatrixSelected(value)}
          onChange={(codes) => onChange(codes)}
          disabled={disabled}
        />
      )}

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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5 pt-1">
          {/* Tombol YA (Emerald Modern) */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange("TRUE")}
            className={`min-h-[44px] h-11 px-3 sm:px-4 rounded-xl text-[12px] sm:text-[13px] font-bold border transition-all flex items-center justify-center gap-1.5 sm:gap-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 cursor-pointer ${
              String(value ?? "").toUpperCase() === "TRUE"
                ? "bg-[#00A876] text-white border-[#00A876] shadow-sm ring-2 ring-[#00A876]/30"
                : "bg-surface border-border text-foreground hover:border-[#00A876]/60 hover:bg-[#00A876]/5"
            }`}
          >
            <Check className="w-4 h-4 stroke-[3] shrink-0" /> Ya (Memenuhi)
          </button>

          {/* Tombol TIDAK (Soft Coral / Rose) */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange("FALSE")}
            className={`min-h-[44px] h-11 px-3 sm:px-4 rounded-xl text-[12px] sm:text-[13px] font-bold border transition-all flex items-center justify-center gap-1.5 sm:gap-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 cursor-pointer ${
              String(value ?? "").toUpperCase() === "FALSE"
                ? "bg-[#E15A4F] text-white border-[#E15A4F] shadow-sm ring-2 ring-[#E15A4F]/30"
                : "bg-surface border-border text-foreground hover:border-[#E15A4F]/60 hover:bg-[#E15A4F]/5"
            }`}
          >
            <X className="w-4 h-4 stroke-[3] shrink-0" /> Tidak
          </button>

          {/* Tombol T/A (Amber Soft) */}
          {(f.config?.allowNA || f.allowNA) && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange("NA")}
              className={`min-h-[44px] h-11 px-3 sm:px-4 rounded-xl text-[11px] sm:text-[12px] font-bold border transition-all flex items-center justify-center gap-1.5 col-span-2 sm:col-span-1 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 cursor-pointer ${
                String(value ?? "").toUpperCase() === "NA"
                  ? "bg-amber-500 text-white border-amber-500 shadow-sm ring-2 ring-amber-500/30"
                  : "bg-surface border-border text-muted-foreground hover:border-amber-400 hover:text-foreground hover:bg-amber-50/50"
              }`}
            >
              T/A (Tidak Ada)
            </button>
          )}
        </div>
      )}

      {f.tipe === "TEXT" &&
        !isSignatureField(f) &&
        (isSingleLineField(f) ? (
          <Input
            type="text"
            disabled={disabled}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={f.pertanyaan ? `Masukkan ${f.pertanyaan.toLowerCase()}...` : "Masukkan data..."}
            className="h-11 rounded-xl text-[13px] font-medium"
          />
        ) : (
          <Textarea
            rows={3}
            disabled={disabled}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Tuliskan keterangan / uraian temuan..."
            className="rounded-xl text-[13px] leading-relaxed resize-y"
          />
        ))}

      {f.tipe === "NUMBER" && (
        <Input
          type="number"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="max-w-[200px] h-11 rounded-xl text-[13px] font-medium tabular-nums"
        />
      )}

      {f.tipe === "DATE" && (
        <Input
          type="date"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="max-w-[220px] h-11 rounded-xl text-[13px] font-medium"
        />
      )}

      {(f.tipe === "DROPDOWN" || f.tipe === "SELECT") && (
        <Select
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 rounded-xl text-[13px] font-medium"
        >
          <option value="">— Pilih Opsi —</option>
          {parseDropdownOptions(f.options || f.opsi || f.config?.options).map((opt: string) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </Select>
      )}

      {f.tipe === "GPS" &&
        (() => {
          const coords = String(value || "").trim();
          const parts = coords.split(",").map((p) => p.trim());
          const lat = parts[0] ? Number.parseFloat(parts[0]) : Number.NaN;
          const lng = parts[1] ? Number.parseFloat(parts[1]) : Number.NaN;
          const validCoords =
            !Number.isNaN(lat) &&
            !Number.isNaN(lng) &&
            lat >= -90 &&
            lat <= 90 &&
            lng >= -180 &&
            lng <= 180 &&
            !(lat === 0 && lng === 0);
          const mapsUrl = validCoords ? `https://www.google.com/maps?q=${lat},${lng}` : null;
          return (
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onGPS}
                  className="h-11 px-4 rounded-xl text-[12px] font-bold"
                >
                  <MapPin className="w-4 h-4 text-primary" />
                  {hasValue ? "Perbarui Koordinat" : "Ambil Lokasi GPS"}
                </Button>
                {validCoords && (
                  <Badge
                    variant="secondary"
                    className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary font-mono text-[11px] font-bold gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" /> {coords}
                  </Badge>
                )}
                {mapsUrl && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 rounded-xl text-[11px] font-bold text-muted-foreground hover:text-foreground"
                  >
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5" /> Buka di Maps
                    </a>
                  </Button>
                )}
              </div>
              {/* Interaktif WebGL Vector MapPicker (MapLibre GL) */}
              <div className="rounded-xl overflow-hidden border border-border shadow-subtle">
                <MapPicker
                  lat={validCoords ? lat : null}
                  lng={validCoords ? lng : null}
                  onChange={(newLat, newLng) => onChange(`${newLat.toFixed(6)}, ${newLng.toFixed(6)}`)}
                  height="220px"
                />
              </div>
            </div>
          );
        })()}

      {/* Mandatory Client-Side Compressed Photo */}
      {f.tipe === "PHOTO" && (
        <div className="space-y-2">
          {isCompressing ? (
            <div className="flex items-center gap-2.5 p-4 rounded-2xl border border-dashed border-primary bg-primary/5 text-primary text-[12px] font-bold animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              Mengompresi foto (mengurangi ukuran ke ~200KB)...
            </div>
          ) : photoPreview ? (
            <div className="relative inline-block rounded-2xl overflow-hidden border border-border shadow-subtle group">
              {/* biome-ignore lint/performance/noImgElement: user inspection photo preview */}
              <img src={photoPreview} className="w-48 h-36 object-cover" alt="Foto Inspeksi" />
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
            <label className="inline-flex items-center gap-2.5 h-11 px-5 rounded-2xl border-2 border-dashed border-border hover:border-primary bg-surface cursor-pointer text-[12px] font-bold text-muted-foreground hover:text-primary transition-all shadow-subtle">
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
