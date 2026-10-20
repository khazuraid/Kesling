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
import Image from "next/image";
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

  // Kumpulkan foto-foto dokumentasi
  const allPhotos = useMemo(() => {
    if (!result) return [];
    const photos: { url: string; label?: string }[] = [];

    if (Array.isArray(result.fotoPaths)) {
      result.fotoPaths.forEach((p, idx) => {
        if (typeof p === "string" && p) {
          photos.push({ url: p, label: `Dokumentasi #${idx + 1}` });
        }
      });
    }

    (result.values || []).forEach((v) => {
      if (v.field?.tipe === "PHOTO" && v.valueString) {
        if (!photos.some((p) => p.url === v.valueString)) {
          photos.push({
            url: v.valueString,
            label: v.field.pertanyaan || "Foto Dokumentasi",
          });
        }
      }
    });

    return photos;
  }, [result]);

  // Kumpulkan tanda tangan
  const signatures = useMemo(() => {
    if (!result) return { petugas: null, pemilik: null };
    const sigMap: Record<string, string> =
      result.signatureData && typeof result.signatureData === "object" ? result.signatureData : {};

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

    (result.values || []).forEach((v) => {
      if (v.field?.tipe === "SIGNATURE" && v.valueString) {
        const q = (v.field.pertanyaan || "").toLowerCase();
        if (q.includes("pemilik") || q.includes("pengelola")) {
          pemilik = v.valueString;
        } else if (!petugas) {
          petugas = v.valueString;
        }
      }
    });

    return { petugas, pemilik };
  }, [result]);

  if (!isOpen || !result) return null;

  const namaSasaran = result.sasaran?.nama || result.namaSasaran || "Sasaran Tanpa Nama";
  const alamatSasaran = result.sasaran?.alamat || result.alamatSasaran || "Alamat belum diisi";
  const pengelolaSasaran = result.sasaran?.pemilik || "-";
  const kontakSasaran = result.sasaran?.kontak;
  const puskesmasNama = result.puskesmas?.nama || "Puskesmas";
  const petugasNama = result.user?.nama || "Petugas Pemeriksa";
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
  const fieldsFromTemplate = (template.fields || []).filter(
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
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-primary px-2 py-0.5 rounded-full bg-primary-subtle border border-primary/20">
                  Detail Pemeriksaan
                </span>
                <span className="text-[10px] sm:text-[11px] text-muted-foreground truncate hidden sm:inline">
                  No. #{result.id}
                </span>
              </div>
              <h2 className="text-[15px] sm:text-[18px] font-black text-foreground truncate mt-0.5">{namaSasaran}</h2>
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
        <div className="p-4 sm:p-6 bg-gradient-to-b from-[hsl(var(--muted))]/30 to-transparent border-b border-[hsl(var(--border))] shrink-0 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Skor Card */}
            {scoreData && (
              <div className="flex items-center gap-4 p-3.5 sm:p-4 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-sm">
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center font-black leading-none shrink-0 border ${
                    scoreData.pass
                      ? "bg-[#00A876]/10 text-[#00A876] border-[#00A876]/25"
                      : "bg-[#E15A4F]/10 text-[#E15A4F] border-[#E15A4F]/25"
                  }`}
                >
                  <span className="text-[18px] sm:text-[22px] tracking-tight">{scoreData.valueText}</span>
                  <span className="text-[9px] font-bold uppercase mt-0.5 opacity-80">Skor</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wide ${
                        scoreData.pass ? "bg-[#00A876] text-white" : "bg-[#E15A4F] text-white"
                      }`}
                    >
                      {scoreData.pass ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {scoreData.statusText}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-[12px] font-semibold text-[hsl(var(--muted-foreground))] mt-1.5">
                    Perolehan: <strong className="text-[hsl(var(--foreground))]">{scoreData.gained}</strong> dari{" "}
                    {scoreData.max} Poin Maksimal
                    <span className="text-[10px] opacity-75 ml-1.5">
                      (Standar: {scoreData.op} {scoreData.thresh}%)
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* Quick Metadata Info */}
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5 text-[11px] sm:text-[12px] text-[hsl(var(--muted-foreground))]">
              <div className="flex items-center gap-2 truncate">
                <Calendar className="w-4 h-4 text-[#00A876] shrink-0" />
                <span className="truncate">{tanggalFormat}</span>
              </div>
              <div className="flex items-center gap-2 truncate">
                <Building2 className="w-4 h-4 text-[#00A876] shrink-0" />
                <span className="truncate font-medium">{puskesmasNama}</span>
              </div>
              <div className="flex items-center gap-2 truncate">
                <User className="w-4 h-4 text-[#00A876] shrink-0" />
                <span className="truncate">
                  Petugas: <strong className="text-[hsl(var(--foreground))]">{petugasNama}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 truncate">
                <FileText className="w-4 h-4 text-[#00A876] shrink-0" />
                <span className="truncate">{template.nama}</span>
              </div>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-[12px]">
                  <div>
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] block">Nama Tempat / Sasaran</span>
                    <strong className="text-[hsl(var(--foreground))] font-bold">{namaSasaran}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] block">Pengelola / Pemilik</span>
                    <span className="text-[hsl(var(--foreground))] font-semibold">{pengelolaSasaran}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] block">Jenis Sarana</span>
                    <span className="text-[hsl(var(--foreground))] font-semibold">
                      {result.sasaran?.subCategory?.nama || template.subCategory?.nama || "-"}
                    </span>
                  </div>
                  {kontakSasaran && (
                    <div>
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))] block">Kontak / Telepon</span>
                      <span className="text-[hsl(var(--foreground))] font-semibold flex items-center gap-1">
                        <Phone className="w-3 h-3 text-[#00A876]" /> {kontakSasaran}
                      </span>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] block">Alamat</span>
                    <span className="text-[hsl(var(--foreground))] flex items-start gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-[#00A876] shrink-0 mt-0.5" />
                      {alamatSasaran}
                    </span>
                  </div>
                  {(result.lat && result.lng) || (result.sasaran?.lat && result.sasaran?.lng) ? (
                    <div>
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))] block">Koordinat GPS</span>
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
                              {f.tipe === "BOOLEAN" ? (
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {allPhotos.map((photo, pIdx) => (
                    <div
                      key={pIdx}
                      onClick={() => setPreviewPhoto(photo.url)}
                      className="group relative flex flex-col rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden shadow-sm hover:border-[#00A876] transition-all cursor-pointer"
                    >
                      <div className="relative aspect-[4/3] bg-black/5 overflow-hidden">
                        <Image
                          src={photo.url}
                          alt={photo.label || "Foto Dokumentasi"}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold">
                          Klik untuk memperbesar
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-[12px] font-bold text-[hsl(var(--foreground))] truncate">
                          {photo.label || `Foto #${pIdx + 1}`}
                        </p>
                        <span className="text-[10px] text-[hsl(var(--muted-foreground))] block mt-0.5">
                          Dokumentasi Hasil Lapangan
                        </span>
                      </div>
                    </div>
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
                      <Image
                        src={
                          signatures.petugas.startsWith("data:image/")
                            ? signatures.petugas
                            : `data:image/png;base64,${signatures.petugas}`
                        }
                        alt="Tanda Tangan Petugas"
                        width={280}
                        height={120}
                        className="max-h-full max-w-full object-contain"
                        unoptimized
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
                      <Image
                        src={
                          signatures.pemilik.startsWith("data:image/")
                            ? signatures.pemilik
                            : `data:image/png;base64,${signatures.pemilik}`
                        }
                        alt="Tanda Tangan Pengelola"
                        width={280}
                        height={120}
                        className="max-h-full max-w-full object-contain"
                        unoptimized
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
          className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
        >
          <div className="relative max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-black">
            <Image
              src={previewPhoto}
              alt="Preview Zoom"
              width={1200}
              height={900}
              className="max-h-[85vh] max-w-full w-auto h-auto object-contain"
              unoptimized
            />
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
