"use client";

import {
  Building2,
  Calendar,
  CheckCircle2,
  Compass,
  Download,
  Edit3,
  FileCheck2,
  FileText,
  ImageIcon,
  Loader2,
  MapPin,
  PenTool,
  Phone,
  User,
  X,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { calculateInspectionScore, generateInspectionPDF, type InspectionDetailData } from "./pdf-generator";

interface DetailResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: InspectionDetailData | null;
  template?: any;
  onEdit?: (result: InspectionDetailData) => void;
}

function PhotoCard({
  photo,
  index,
  single,
  onPreview,
}: {
  photo: { url: string; label?: string };
  index: number;
  single?: boolean;
  onPreview: (url: string) => void;
}) {
  const [hasError, setHasError] = useState(false);

  return (
    <div
      onClick={() => onPreview(photo.url)}
      className="group relative flex flex-col rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden shadow-sm hover:border-[#00A876] transition-all cursor-pointer"
    >
      <div
        className={`relative ${
          single ? "aspect-[16/10] sm:aspect-[4/3]" : "aspect-[4/3]"
        } bg-[hsl(var(--muted))]/30 overflow-hidden flex items-center justify-center`}
      >
        {hasError ? (
          <div className="p-4 flex flex-col items-center justify-center text-center space-y-1.5 text-[hsl(var(--muted-foreground))]">
            <ImageIcon className="w-8 h-8 opacity-40" />
            <span className="text-[11px] font-semibold">Foto tidak dapat dimuat</span>
            <span className="text-[10px] opacity-70 truncate max-w-[180px]">{photo.url}</span>
          </div>
        ) : (
          <>
            {/* biome-ignore lint/performance/noImgElement: direct img prevents next/image runtime crash on arbitrary inspection uploads */}
            <img
              src={photo.url}
              alt={photo.label || "Foto Dokumentasi"}
              loading="lazy"
              decoding="async"
              onError={() => setHasError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold">
              Klik untuk memperbesar
            </div>
          </>
        )}
      </div>
      <div className="p-3">
        <p className="text-[13px] font-bold text-[hsl(var(--foreground))] truncate">
          {photo.label || `Foto #${index + 1}`}
        </p>
        <span className="text-[11px] text-[hsl(var(--muted-foreground))] block mt-0.5">Dokumentasi Hasil Lapangan</span>
      </div>
    </div>
  );
}

export function DetailResultModal({
  isOpen,
  onClose,
  result,
  template: initialTemplate,
  onEdit,
}: DetailResultModalProps) {
  const [activeTab, setActiveTab] = useState<"penilaian" | "foto" | "ttd">("penilaian");
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const template = result?.template || initialTemplate || {};

  const scoreData = useMemo(() => {
    if (!result) return null;
    return calculateInspectionScore(result, template);
  }, [result, template]);

  // Kumpulkan foto-foto dokumentasi secara aman & robust
  const allPhotos = useMemo(() => {
    if (!result) return [];
    const photos: { url: string; label?: string }[] = [];
    const seenUrls = new Set<string>();

    // 0. Kumpulkan semua nilai tanda tangan agar tidak pernah masuk ke galeri foto
    const signatureStringSet = new Set<string>();
    if (result.signatureData) {
      if (typeof result.signatureData === "string") {
        try {
          const parsed = JSON.parse(result.signatureData);
          if (typeof parsed === "object" && parsed !== null) {
            Object.values(parsed).forEach((s) => {
              if (typeof s === "string" && s.trim()) signatureStringSet.add(s.trim());
            });
          }
        } catch {
          signatureStringSet.add(result.signatureData.trim());
        }
      } else if (typeof result.signatureData === "object") {
        Object.values(result.signatureData).forEach((s) => {
          if (typeof s === "string" && s.trim()) signatureStringSet.add(s.trim());
        });
      }
    }

    const fields = template?.fields || result.template?.fields || [];
    (result.values || []).forEach((v: any) => {
      const field = v.field || fields.find((f: any) => f.id === v.fieldId);
      const tipe = (field?.tipe || "").toUpperCase();
      const q = (field?.pertanyaan || "").toLowerCase();
      const isSig =
        tipe === "SIGNATURE" ||
        tipe === "TTD" ||
        q.includes("tanda tangan") ||
        q.includes("ttd") ||
        q.includes("paraf");
      if (isSig && v.valueString && typeof v.valueString === "string") {
        signatureStringSet.add(v.valueString.trim());
      }
    });

    const normalizeUrl = (raw: unknown): string | null => {
      if (!raw || typeof raw !== "string") return null;
      let u = raw.trim();
      if (!u || u === "-" || u === "null" || u === "undefined" || u === "[]" || u === "{}") return null;

      // Tolak jika merupakan tanda tangan yang terdaftar
      if (signatureStringSet.has(u)) return null;

      if (u.startsWith("data:image/")) return u;
      u = u.replace(/\\/g, "/");
      if (/^https?:\/\//i.test(u)) return u;

      if (u.startsWith("/public/uploads/")) {
        u = u.replace("/public", "");
      } else if (u.startsWith("public/uploads/")) {
        u = `/${u.replace("public/", "")}`;
      }

      if (!u.startsWith("/")) {
        u = `/${u}`;
      }
      return u;
    };

    const getCanonicalKey = (url: string): string => {
      if (url.startsWith("data:image/")) return url.slice(0, 80);
      return url.split("?")[0].split("#")[0].toLowerCase().trim();
    };

    const addPhoto = (raw: unknown, label?: string) => {
      if (!raw) return;

      if (Array.isArray(raw)) {
        raw.forEach((item, idx) => {
          addPhoto(item, label ? `${label} #${idx + 1}` : undefined);
        });
        return;
      }

      if (typeof raw === "object" && raw !== null) {
        Object.values(raw).forEach((val) => {
          addPhoto(val, label);
        });
        return;
      }

      if (typeof raw !== "string") return;

      const trimmed = raw.trim();
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            parsed.forEach((item, idx) => {
              addPhoto(item, label ? `${label} #${idx + 1}` : undefined);
            });
            return;
          }
        } catch {}
      }

      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        try {
          const parsed = JSON.parse(trimmed);
          if (typeof parsed === "object" && parsed !== null) {
            Object.values(parsed).forEach((val) => {
              addPhoto(val, label);
            });
            return;
          }
        } catch {}
      }

      const normalized = normalizeUrl(trimmed);
      if (!normalized) return;

      const canonical = getCanonicalKey(normalized);
      if (seenUrls.has(canonical)) {
        // Jika sudah ada tapi label baru lebih spesifik dari label generic
        if (label) {
          const existing = photos.find((p) => getCanonicalKey(p.url) === canonical);
          if (existing?.label?.startsWith("Dokumentasi #")) {
            existing.label = label;
          }
        }
        return;
      }

      seenUrls.add(canonical);
      photos.push({
        url: normalized,
        label: label || `Dokumentasi #${photos.length + 1}`,
      });
    };

    // 1. Ekstraksi dari values terlebih dahulu (karena memiliki label pertanyaan yang lebih spesifik)
    (result.values || []).forEach((v: any) => {
      const field = v.field || fields.find((f: any) => f.id === v.fieldId);
      const tipe = (field?.tipe || "").toUpperCase();
      const pertanyaan = field?.pertanyaan || "Foto Dokumentasi";
      const q = pertanyaan.toLowerCase();
      const valStr = typeof v.valueString === "string" ? v.valueString.trim() : "";

      // Pastikan bukan tanda tangan
      if (
        tipe === "SIGNATURE" ||
        tipe === "TTD" ||
        q.includes("tanda tangan") ||
        q.includes("ttd") ||
        q.includes("paraf") ||
        signatureStringSet.has(valStr)
      ) {
        return;
      }

      const isPhotoField = tipe === "PHOTO" || tipe === "FOTO" || tipe === "IMAGE" || tipe === "FILE";
      const looksLikeImage =
        valStr.includes("/uploads/") ||
        valStr.includes("uploads/") ||
        /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(valStr) ||
        (valStr.startsWith("data:image/") && !signatureStringSet.has(valStr));

      if ((isPhotoField || looksLikeImage) && valStr) {
        addPhoto(valStr, pertanyaan);
      }
    });

    // 2. Ekstraksi dari result.fotoPaths (jika ada foto kegiatan lapangan tambahan)
    if (result.fotoPaths) {
      addPhoto(result.fotoPaths, "Foto Kegiatan");
    }

    return photos;
  }, [result, template]);

  // Kumpulkan tanda tangan secara aman
  const signatures = useMemo(() => {
    if (!result) return { petugas: null, pemilik: null };
    let sigMap: Record<string, string> = {};

    if (typeof result.signatureData === "string") {
      try {
        sigMap = JSON.parse(result.signatureData);
      } catch {
        sigMap = {};
      }
    } else if (result.signatureData && typeof result.signatureData === "object") {
      sigMap = result.signatureData;
    }

    let petugas: string | null = sigMap.petugas || null;
    let pemilik: string | null = sigMap.pemilik || null;

    Object.entries(sigMap).forEach(([k, val]) => {
      if (!val || typeof val !== "string") return;
      const lower = k.toLowerCase();
      if (lower.includes("petugas") || lower.includes("pemeriksa") || lower.includes("sanitarian")) {
        petugas = val;
      } else if (lower.includes("pemilik") || lower.includes("pengelola") || lower.includes("sasaran")) {
        pemilik = val;
      } else if (!petugas) {
        petugas = val;
      }
    });

    const fields = template?.fields || result.template?.fields || [];
    (result.values || []).forEach((v: any) => {
      const field = v.field || fields.find((f: any) => f.id === v.fieldId);
      const tipe = (field?.tipe || "").toUpperCase();
      if ((tipe === "SIGNATURE" || tipe === "TTD") && v.valueString) {
        const q = (field?.pertanyaan || "").toLowerCase();
        if (q.includes("pemilik") || q.includes("pengelola")) {
          pemilik = v.valueString;
        } else if (!petugas) {
          petugas = v.valueString;
        }
      }
    });

    return { petugas, pemilik };
  }, [result, template]);

  // Nama pengelola/pemilik sebenarnya disimpan sebagai field kuesioner grup __META__,
  // bukan di Sasaran.pemilik (yang hanya terisi bila sasaran dibuat manual).
  // Dibatasi ke grup __META__ agar butir checklist (mis. "Lokasi bebas dari pencemaran")
  // tidak tersalin sebagai alamat/nama.
  const metaText = useMemo(() => {
    const fields = template?.fields || result?.template?.fields || [];
    const pick = (...keys: string[]) => {
      const hit = (result?.values || []).find((v: any) => {
        const field = v.field || fields.find((f: any) => f.id === v.fieldId);
        if (field?.grup !== "__META__") return false;
        const q = String(field?.pertanyaan || "").toLowerCase();
        const text = String(v.valueString ?? "").trim();
        return keys.some((k) => q.includes(k)) && text !== "" && !/^(TRUE|FALSE|NA)$/i.test(text);
      });
      return hit ? String(hit.valueString).trim() : "";
    };
    return {
      pengelola: pick("pengelola", "penanggung jawab", "pemilik"),
      petugas: pick("petugas", "pemeriksa", "sanitarian"),
      sarana: pick("nama sarana", "unit sppg"),
      alamat: pick("alamat", "lokasi", "tempat"),
      wilayah: pick("wilayah kerja", "puskesmas"),
    };
  }, [result, template]);

  if (!isOpen || !result) return null;

  // Nilai field PHOTO bisa berupa satu path, JSON array, atau daftar dipisah koma.
  // Ambil URL pertama yang valid agar tidak meminta string mentah ke server (HTTP 400).
  const firstPhotoUrl = (raw: unknown): string | null => {
    const candidates: string[] = [];
    const walk = (val: unknown) => {
      if (!val) return;
      if (Array.isArray(val)) {
        val.forEach(walk);
        return;
      }
      if (typeof val === "object") {
        Object.values(val as Record<string, unknown>).forEach(walk);
        return;
      }
      const s = String(val).trim();
      if (!s) return;
      if (s.startsWith("[") && s.endsWith("]")) {
        try {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed)) {
            parsed.forEach(walk);
            return;
          }
        } catch {}
      }
      for (const part of s.split(",")) candidates.push(part.trim());
    };
    walk(raw);
    const hit = candidates.find((c) => {
      if (!c || c === "-" || c === "null" || c === "undefined") return false;
      if (c.startsWith("data:image/")) return true;
      if (/^https?:\/\//i.test(c)) return true;
      return /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(c) || c.includes("/uploads/");
    });
    if (!hit) return null;
    if (hit.startsWith("data:image/") || /^https?:\/\//i.test(hit)) return hit;
    const noPublic = hit.replace(/^\/?public\//, "/");
    return noPublic.startsWith("/") ? noPublic : `/${noPublic}`;
  };

  const namaSasaran = result.sasaran?.nama || metaText.sarana || result.namaSasaran || "Sasaran Tanpa Nama";
  const alamatSasaran = result.sasaran?.alamat || result.alamatSasaran || metaText.alamat || "Alamat belum diisi";
  const pengelolaSasaran = result.sasaran?.pemilik || metaText.pengelola || "-";
  const kontakSasaran = result.sasaran?.kontak;
  const puskesmasNama = result.puskesmas?.nama || "Puskesmas";
  const petugasNama = result.user?.nama || metaText.petugas || "Petugas Pemeriksa";
  const tanggalFormat = result.tanggal
    ? new Date(result.tanggal).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : new Date(result.createdAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

  const handleDownloadPDF = async () => {
    setIsExportingPDF(true);
    try {
      await generateInspectionPDF(result, template);
      toast.success("Berita Acara & Hasil Inspeksi PDF berhasil diunduh");
    } catch (err) {
      console.error("Gagal cetak PDF:", err);
      toast.error("Gagal mengunduh file PDF");
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Kelompokkan pertanyaan kuesioner per bagian/grup
  const fieldsFromTemplate = (template?.fields || []).filter(
    (f: any) => f.grup !== "__META__" && f.tipe !== "SIGNATURE" && f.tipe !== "PHOTO",
  );

  // Fallback: Jika template.fields kosong, bangun list dari result.values yang membawa field info
  const fields =
    fieldsFromTemplate.length > 0
      ? fieldsFromTemplate
      : (result?.values || [])
          .filter(
            (v: any) =>
              v.field && v.field.grup !== "__META__" && v.field.tipe !== "SIGNATURE" && v.field.tipe !== "PHOTO",
          )
          .map((v: any) => v.field);

  const groupedFields: { grup: string; items: any[] }[] = [];
  fields.forEach((f: any) => {
    const grp = f.grup || "Komponen Pemeriksaan";
    let grpObj = groupedFields.find((g) => g.grup === grp);
    if (!grpObj) {
      grpObj = { grup: grp, items: [] };
      groupedFields.push(grpObj);
    }
    grpObj.items.push(f);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-5 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl h-[95vh] sm:h-auto sm:max-h-[88vh] flex flex-col bg-surface border border-border rounded-t-3xl sm:rounded-3xl shadow-float overflow-hidden">
        {/* ── HEADER MODAL (Tamagui Clean Bento) ── */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border bg-surface text-foreground flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-primary-subtle text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <FileCheck2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-primary px-2 py-0.5 rounded-full bg-primary-subtle border border-primary/20">
                  Detail Pemeriksaan
                </span>
                <span className="text-[10px] sm:text-[11px] text-muted-foreground truncate hidden sm:inline">
                  No. #{result.id}
                </span>
              </div>
              <h2 className="text-[16px] sm:text-[19px] font-black text-foreground truncate mt-0.5" title={namaSasaran}>
                {namaSasaran}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isExportingPDF}
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-[12px] font-extrabold transition-all shadow-subtle disabled:opacity-50"
            >
              {isExportingPDF ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyiapkan...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" /> Unduh PDF
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── SCORECARD & SUB-HEADER ── */}
        <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 bg-surface border-b border-border shrink-0 space-y-3.5">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-3.5">
            {/* Skor Card */}
            {scoreData &&
              (() => {
                const pct = Math.min(100, Math.max(0, scoreData.percentValue || 0));
                const R = 42;
                const C = 2 * Math.PI * R;
                const accent = scoreData.pass ? "#00A876" : "#E15A4F";
                return (
                  <div className="relative overflow-hidden p-4 rounded-2xl bg-surface border border-border shadow-subtle">
                    <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: accent }} />
                    <div className="flex items-center gap-4">
                      {/* Ring progres */}
                      <div className="relative w-[76px] h-[76px] sm:w-[84px] sm:h-[84px] shrink-0">
                        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                          <circle
                            cx="50"
                            cy="50"
                            r={R}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="10"
                            className="text-muted"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r={R}
                            fill="none"
                            stroke={accent}
                            strokeWidth="10"
                            strokeLinecap="round"
                            strokeDasharray={C}
                            strokeDashoffset={C * (1 - pct / 100)}
                            style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.16,1,0.3,1)" }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-[17px] sm:text-[20px] font-black tabular-nums leading-none text-foreground">
                            {scoreData.valueText}
                          </span>
                          <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground mt-1">
                            Skor
                          </span>
                        </div>
                      </div>

                      <div className="min-w-0 flex-1 space-y-2.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wide text-white ${
                            scoreData.pass ? "bg-[#00A876]" : "bg-[#E15A4F]"
                          }`}
                        >
                          {scoreData.pass ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          {scoreData.statusText}
                        </span>

                        {/* Bar perolehan + penanda ambang */}
                        <div className="space-y-1.5">
                          <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${pct}%`, backgroundColor: accent }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground gap-2">
                            <span className="tabular-nums">
                              Perolehan: <strong className="text-foreground font-black">{scoreData.gained}</strong> /{" "}
                              {scoreData.max} Poin
                            </span>
                            <span className="tabular-nums shrink-0">
                              Batas kelulusan {scoreData.op} {scoreData.thresh}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

            {/* Quick Metadata Info */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Calendar, label: "Tanggal", value: tanggalFormat },
                { icon: Building2, label: "Puskesmas", value: puskesmasNama },
                { icon: User, label: "Petugas", value: petugasNama },
                { icon: FileText, label: "Formulir", value: template?.nama },
              ].map((meta) => {
                const MIcon = meta.icon;
                return (
                  <div
                    key={meta.label}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border bg-surface-subtle/60 min-w-0"
                  >
                    <span className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0">
                      <MIcon className="w-3.5 h-3.5 text-[#00A876]" />
                    </span>
                    <div className="min-w-0">
                      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                        {meta.label}
                      </span>
                      <span
                        className="block text-[12px] sm:text-[13px] font-bold text-foreground truncate"
                        title={meta.value ? String(meta.value) : undefined}
                      >
                        {meta.value || "-"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Segmented Tabs Navigation */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-[hsl(var(--muted))] w-full overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab("penilaian")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-[12px] font-bold transition-all whitespace-nowrap ${
                activeTab === "penilaian"
                  ? "bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm"
                  : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              }`}
            >
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Butir ({fields.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("foto")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-[12px] font-bold transition-all whitespace-nowrap ${
                activeTab === "foto"
                  ? "bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm"
                  : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Foto ({allPhotos.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ttd")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-[12px] font-bold transition-all whitespace-nowrap ${
                activeTab === "ttd"
                  ? "bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm"
                  : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              }`}
            >
              <PenTool className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Tanda Tangan
            </button>
          </div>
        </div>

        {/* ── MODAL BODY CONTENT ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: PENILAIAN */}
          {activeTab === "penilaian" && (
            <div className="space-y-6">
              {/* Profil Sasaran Detail Card */}
              <div className="p-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 space-y-3">
                <h4 className="text-[12px] font-black uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#00A876]" /> Profil Sasaran Pemeriksaan
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-4 text-[13px] [&>div]:min-w-0">
                  <div>
                    <span className="text-[11px] leading-snug text-[hsl(var(--muted-foreground))] block">
                      Nama Tempat / Sasaran
                    </span>
                    <strong className="text-[hsl(var(--foreground))] font-bold break-words">{namaSasaran}</strong>
                  </div>
                  <div>
                    <span className="text-[11px] leading-snug text-[hsl(var(--muted-foreground))] block">
                      Pengelola / Pemilik
                    </span>
                    <span className="text-[hsl(var(--foreground))] font-semibold break-words">{pengelolaSasaran}</span>
                  </div>
                  <div>
                    <span className="text-[11px] leading-snug text-[hsl(var(--muted-foreground))] block">
                      Jenis Sarana
                    </span>
                    <span className="text-[hsl(var(--foreground))] font-semibold">
                      {result.sasaran?.subCategory?.nama || template?.subCategory?.nama || "-"}
                    </span>
                  </div>
                  {kontakSasaran && (
                    <div>
                      <span className="text-[11px] leading-snug text-[hsl(var(--muted-foreground))] block">
                        Kontak / Telepon
                      </span>
                      <span className="text-[hsl(var(--foreground))] font-semibold flex items-center gap-1 break-words">
                        <Phone className="w-3 h-3 text-[#00A876]" /> {kontakSasaran}
                      </span>
                    </div>
                  )}
                  <div className="sm:col-span-2 md:col-span-3">
                    <span className="text-[11px] leading-snug text-[hsl(var(--muted-foreground))] block">Alamat</span>
                    <span className="text-[hsl(var(--foreground))] flex items-start gap-1 mt-0.5 break-words">
                      <MapPin className="w-3.5 h-3.5 text-[#00A876] shrink-0 mt-0.5" />
                      {alamatSasaran}
                    </span>
                  </div>
                  {(result.lat && result.lng) || (result.sasaran?.lat && result.sasaran?.lng) ? (
                    <div>
                      <span className="text-[11px] leading-snug text-[hsl(var(--muted-foreground))] block">
                        Koordinat GPS
                      </span>
                      <a
                        href={`https://www.google.com/maps?q=${result.lat || result.sasaran?.lat},${result.lng || result.sasaran?.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#00A876] hover:underline flex items-center gap-1 font-mono text-[11px] mt-0.5"
                      >
                        <Compass className="w-3.5 h-3.5 shrink-0" />
                        {Number(result.lat || result.sasaran?.lat).toFixed(5)},{" "}
                        {Number(result.lng || result.sasaran?.lng).toFixed(5)}
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Daftar Butir Pertanyaan per Bagian */}
              <div className="space-y-4">
                {groupedFields.map((grp, grpIdx) => (
                  <div
                    key={grpIdx}
                    className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden shadow-sm"
                  >
                    <div className="px-4 py-3 bg-[hsl(var(--muted))]/50 border-b border-[hsl(var(--border))] flex items-center justify-between">
                      <h4 className="text-[13px] font-black text-[hsl(var(--foreground))]">{grp.grup}</h4>
                      <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))]">
                        {grp.items.length} butir
                      </span>
                    </div>

                    <div className="divide-y divide-[hsl(var(--border))]">
                      {grp.items.map((f: any, idx: number) => {
                        const valObj = (result.values || []).find((v: any) => v.fieldId === f.id);
                        const valStr = String(valObj?.valueString ?? "").toUpperCase();
                        const isTrue = valStr === "TRUE";
                        const isFalse = valStr === "FALSE";
                        const isNA = valStr === "NA";

                        return (
                          <div
                            key={f.id}
                            className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[hsl(var(--muted))]/10 transition-colors"
                          >
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <span className="w-6 h-6 rounded-lg bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="text-[12px] sm:text-[13px] font-semibold text-[hsl(var(--foreground))] leading-snug">
                                  {f.pertanyaan}
                                </p>
                                {f.tipe !== "BOOLEAN" && (
                                  <span className="text-[10px] font-medium text-[hsl(var(--muted-foreground))] block mt-0.5">
                                    Tipe: {f.tipe}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Badge Jawaban */}
                            <div className="shrink-0 sm:text-right">
                              {f.tipe === "PHOTO" ? (
                                firstPhotoUrl(valObj?.valueString) ? (
                                  <div
                                    onClick={() => setPreviewPhoto(firstPhotoUrl(valObj?.valueString))}
                                    className="inline-flex items-center gap-2 p-1.5 rounded-xl border border-border bg-surface hover:border-primary transition-all cursor-pointer shadow-xs group/photo"
                                  >
                                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-black/5">
                                      {/* biome-ignore lint/performance/noImgElement: photo field preview */}
                                      <img
                                        src={firstPhotoUrl(valObj?.valueString) || ""}
                                        alt={f.pertanyaan || "Foto"}
                                        onError={(e) => {
                                          (e.currentTarget as HTMLImageElement).style.display = "none";
                                        }}
                                        className="w-full h-full object-cover group-hover/photo:scale-105 transition-transform"
                                      />
                                    </div>
                                    <span className="text-[11px] font-bold text-primary pr-2 flex items-center gap-1">
                                      <ImageIcon className="w-3.5 h-3.5" /> Lihat Foto
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-[hsl(var(--muted-foreground))] italic">
                                    Foto belum diunggah
                                  </span>
                                )
                              ) : f.tipe === "MATRIX_AREA" ? (
                                (() => {
                                  let violatedCodes: string[] = [];
                                  if (Array.isArray(valObj?.valueJson)) {
                                    violatedCodes = valObj.valueJson.map(String);
                                  } else if (typeof valObj?.valueString === "string" && valObj.valueString.trim()) {
                                    try {
                                      const p = JSON.parse(valObj.valueString);
                                      violatedCodes = Array.isArray(p)
                                        ? p.map(String)
                                        : valObj.valueString.split(",").map((s: string) => s.trim());
                                    } catch {
                                      violatedCodes = valObj.valueString.split(",").map((s: string) => s.trim());
                                    }
                                  }
                                  const areaScores: Record<string, any> = f.config?.areaScores || {};
                                  const subNo = f.config?.subNomor;

                                  return (
                                    <div className="flex flex-col sm:items-end gap-1.5">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        {subNo && (
                                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-muted text-foreground border border-border">
                                            #{subNo}
                                          </span>
                                        )}
                                        {violatedCodes.length === 0 ? (
                                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[#00A876]/15 text-[#00A876] text-[11px] font-black border border-[#00A876]/30">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> 100% Memenuhi (0 TMS)
                                          </span>
                                        ) : (
                                          <div className="flex items-center gap-1 flex-wrap">
                                            <span className="text-[10px] font-bold text-rose-600 mr-1">
                                              TMS ({violatedCodes.length} Area):
                                            </span>
                                            {violatedCodes.map((code) => {
                                              const pen =
                                                areaScores[code] !== undefined && areaScores[code] !== "NA"
                                                  ? areaScores[code]
                                                  : "1";
                                              return (
                                                <span
                                                  key={code}
                                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[10px] font-black shadow-xs"
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
                                })()
                              ) : f.tipe === "BOOLEAN" ? (
                                isTrue ? (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[#00A876]/15 text-[#00A876] text-[11px] font-black border border-[#00A876]/30">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Ya
                                  </span>
                                ) : isFalse ? (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[#E15A4F]/15 text-[#E15A4F] text-[11px] font-black border border-[#E15A4F]/30">
                                    <XCircle className="w-3.5 h-3.5" /> Tidak
                                  </span>
                                ) : isNA ? (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] text-[11px] font-bold">
                                    T/A
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-[hsl(var(--muted-foreground))] italic">
                                    Belum diisi
                                  </span>
                                )
                              ) : (
                                <span className="inline-block px-3 py-1 rounded-xl bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] text-[12px] font-bold">
                                  {valObj?.valueNumber !== null && valObj?.valueNumber !== undefined
                                    ? String(valObj.valueNumber)
                                    : valObj?.valueString || "-"}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: FOTO DOKUMENTASI */}
          {activeTab === "foto" && (
            <div className="space-y-4">
              {allPhotos.length === 0 ? (
                <div className="border border-dashed border-[hsl(var(--border))] rounded-2xl p-10 flex flex-col items-center justify-center text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-[hsl(var(--muted))] flex items-center justify-center text-[hsl(var(--muted-foreground))]">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <h4 className="text-[13px] font-bold text-[hsl(var(--foreground))]">Tidak Ada Foto Terlampir</h4>
                  <p className="text-[12px] text-[hsl(var(--muted-foreground))] max-w-sm">
                    Pemeriksaan ini tidak menyertakan foto dokumentasi dari lapangan.
                  </p>
                </div>
              ) : (
                <div
                  className={
                    allPhotos.length === 1
                      ? "max-w-md mx-auto w-full"
                      : allPhotos.length === 2
                        ? "grid grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto gap-4"
                        : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
                  }
                >
                  {allPhotos.map((photo, pIdx) => (
                    <PhotoCard
                      key={`${photo.url}-${pIdx}`}
                      photo={photo}
                      index={pIdx}
                      single={allPhotos.length === 1}
                      onPreview={(url) => setPreviewPhoto(url)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TANDA TANGAN */}
          {activeTab === "ttd" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tanda Tangan Petugas */}
                <div className="p-5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col justify-between shadow-sm space-y-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#00A876] block">
                      Petugas Pemeriksa Kesling
                    </span>
                    <h4 className="text-[14px] font-extrabold text-[hsl(var(--foreground))] mt-0.5">{petugasNama}</h4>
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))]">UPT Puskesmas {puskesmasNama}</p>
                  </div>

                  <div className="relative h-36 rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 flex items-center justify-center p-3 overflow-hidden">
                    {signatures.petugas ? (
                      /* biome-ignore lint/performance/noImgElement: direct img prevents next/image runtime crash */
                      <img
                        src={
                          signatures.petugas.startsWith("data:image/") ||
                          signatures.petugas.startsWith("/") ||
                          signatures.petugas.startsWith("http")
                            ? signatures.petugas
                            : `data:image/png;base64,${signatures.petugas}`
                        }
                        alt="Tanda Tangan Petugas"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-[11px] text-[hsl(var(--muted-foreground))] italic">
                        Tanda tangan digital belum terlampir
                      </span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[hsl(var(--border))] text-[11px] text-[hsl(var(--muted-foreground))]">
                    Tanggal: <strong className="text-[hsl(var(--foreground))]">{tanggalFormat}</strong>
                  </div>
                </div>

                {/* Tanda Tangan Pengelola / Pemilik */}
                <div className="p-5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col justify-between shadow-sm space-y-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[hsl(var(--muted-foreground))] block">
                      Pengelola / Penanggung Jawab
                    </span>
                    <h4 className="text-[14px] font-extrabold text-[hsl(var(--foreground))] mt-0.5">
                      {pengelolaSasaran !== "-" ? pengelolaSasaran : namaSasaran}
                    </h4>
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Sasaran: {namaSasaran}</p>
                  </div>

                  <div className="relative h-36 rounded-xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 flex items-center justify-center p-3 overflow-hidden">
                    {signatures.pemilik ? (
                      /* biome-ignore lint/performance/noImgElement: direct img prevents next/image runtime crash */
                      <img
                        src={
                          signatures.pemilik.startsWith("data:image/") ||
                          signatures.pemilik.startsWith("/") ||
                          signatures.pemilik.startsWith("http")
                            ? signatures.pemilik
                            : `data:image/png;base64,${signatures.pemilik}`
                        }
                        alt="Tanda Tangan Pengelola"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-[11px] text-[hsl(var(--muted-foreground))] italic">
                        Paraf / TTD basah tercantum di berita acara fisik
                      </span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[hsl(var(--border))] text-[11px] text-[hsl(var(--muted-foreground))]">
                    Status: <strong className="text-[#00A876]">Tersimpan Resmi</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER MODAL ── */}
        <div className="px-4 sm:px-6 py-3 border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="hidden sm:inline-flex px-4 py-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[12px] font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
          >
            Tutup
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="sm:hidden flex-1 px-3 py-2.5 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[12px] font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors text-center"
            >
              Tutup
            </button>

            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(result);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[11px] sm:text-[12px] font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Edit Pemeriksaan</span>
                <span className="sm:hidden">Edit</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isExportingPDF}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 sm:py-2 rounded-xl bg-[#00A876] hover:bg-[#008f64] text-white text-[11px] sm:text-[12px] font-extrabold transition-all shadow-sm disabled:opacity-50"
            >
              {isExportingPDF ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />{" "}
                  <span className="hidden sm:inline">Menyiapkan PDF...</span>
                  <span className="sm:hidden">Menyiapkan...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Unduh Berita Acara PDF</span>
                  <span className="sm:hidden">Unduh PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── LIGHTBOX PREVIEW FOTO ── */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center rounded-2xl bg-black/60 p-2 border border-white/10"
          >
            {/* biome-ignore lint/performance/noImgElement: direct img for fullscreen zoom preview */}
            <img
              src={previewPhoto}
              alt="Preview Zoom"
              className="max-h-[80vh] max-w-full w-auto h-auto object-contain rounded-xl"
            />
            <div className="w-full flex items-center justify-between mt-3 px-2 text-white/80">
              <span className="text-[12px] font-medium truncate max-w-[70%]">
                {allPhotos.find((p) => p.url === previewPhoto)?.label || "Foto Dokumentasi"}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewPhoto}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-colors"
                >
                  Buka Asli
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewPhoto(null)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
