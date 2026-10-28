"use client";

import { CheckCircle2, ImageIcon, XCircle } from "lucide-react";
import { answerState } from "@/lib/inspection-answers";
import { photoSrc } from "@/lib/photo-url";

/**
 * Badge jawaban satu butir.
 *
 * Tipe MATRIX_AREA dan PHOTO dahulu ditangani inline di dalam render modal
 * (satu blok IIFE 55 baris), sehingga tombol "Lihat Foto" di dalamnya tidak
 * pernah bisa dibaca maupun dijangkau papan ketik.
 */
export function AnswerBadge({
  field,
  value,
  onPreviewPhoto,
}: {
  field: any;
  value: any;
  onPreviewPhoto: (url: string) => void;
}) {
  const tipe = String(field?.tipe ?? "").toUpperCase();

  if (tipe === "PHOTO") {
    const src = photoSrc(value?.valueString);
    if (!src) return <span className="text-[11px] text-muted-foreground italic">Foto belum diunggah</span>;
    return (
      <button
        type="button"
        onClick={() => onPreviewPhoto(src)}
        aria-label={`Perbesar foto: ${field?.pertanyaan || "Foto"}`}
        className="inline-flex items-center gap-2 p-1.5 rounded-xl border border-border bg-surface hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] transition-all cursor-pointer shadow-subtle"
      >
        <span className="relative w-12 h-12 rounded-lg overflow-hidden bg-black/5 block">
          {/* biome-ignore lint/performance/noImgElement: photo field preview */}
          <img src={src} alt={field?.pertanyaan || "Foto"} className="w-full h-full object-cover" />
        </span>
        <span className="text-[11px] font-bold text-primary pr-2 flex items-center gap-1">
          <ImageIcon className="w-3.5 h-3.5" /> Lihat Foto
        </span>
      </button>
    );
  }

  if (tipe === "MATRIX_AREA") {
    let codes: string[] = [];
    if (Array.isArray(value?.valueJson)) codes = value.valueJson.map(String);
    else if (typeof value?.valueString === "string" && value.valueString.trim()) {
      try {
        const parsed = JSON.parse(value.valueString);
        codes = Array.isArray(parsed) ? parsed.map(String) : value.valueString.split(",").map((s: string) => s.trim());
      } catch {
        codes = value.valueString.split(",").map((s: string) => s.trim());
      }
    }
    codes = codes.filter(Boolean);
    const areaScores: Record<string, any> = field?.config?.areaScores || {};
    const subNo = field?.config?.subNomor;

    return (
      <div className="flex flex-col sm:items-end gap-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {subNo && (
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-muted text-foreground border border-border">
              #{subNo}
            </span>
          )}
          {codes.length === 0 ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-success-light text-success text-[11px] font-black border border-success/30">
              <CheckCircle2 className="w-3.5 h-3.5" /> 100% Memenuhi (0 TMS)
            </span>
          ) : (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] font-bold text-error mr-1">TMS ({codes.length} Area):</span>
              {codes.map((code) => {
                const pen = areaScores[code] !== undefined && areaScores[code] !== "NA" ? areaScores[code] : "1";
                return (
                  <span
                    key={code}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-error text-white text-[10px] font-black shadow-subtle"
                  >
                    {code} ({pen})
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (tipe === "BOOLEAN") {
    const state = answerState(value?.valueString);
    if (state === "sesuai") {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-success-light text-success text-[11px] font-black border border-success/30">
          <CheckCircle2 className="w-3.5 h-3.5" /> Ya
        </span>
      );
    }
    if (state === "tidak") {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-error-light text-error text-[11px] font-black border border-error/30">
          <XCircle className="w-3.5 h-3.5" /> Tidak
        </span>
      );
    }
    if (state === "na") {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-muted text-muted-foreground text-[11px] font-bold">
          T/A
        </span>
      );
    }
    return <span className="text-[11px] text-muted-foreground italic">Belum diisi</span>;
  }

  return (
    <span className="inline-block px-3 py-1 rounded-xl bg-muted text-foreground text-[12px] font-bold">
      {value?.valueNumber !== null && value?.valueNumber !== undefined
        ? String(value.valueNumber)
        : value?.valueString || "-"}
    </span>
  );
}
