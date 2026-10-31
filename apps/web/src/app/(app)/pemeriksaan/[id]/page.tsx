"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  Eye,
  FileText,
  ImageIcon,
  Loader2,
  PenTool,
  ShieldAlert,
  User,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PdfViewer } from "@/components/ui/pdf-viewer";
import { groupInspectionFields } from "@/lib/inspection-answers";
import { extractInspectionPhotos, extractInspectionSignatures } from "@/lib/inspection-media";
import { resolveSasaranIdentity } from "@/lib/sasaran-meta";
import { calculateInspectionScore, generateInspectionPDF } from "../pdf-generator";
import { ChecklistGroups, EmptyChecklist, TemuanList } from "./_components/checklist-panel";
import { PhotoGallery } from "./_components/photo-gallery";
import { PhotoLightbox } from "./_components/photo-lightbox";
import { SasaranProfileCard } from "./_components/sasaran-profile-card";
import { ScoreCard, type ScoreData } from "./_components/score-card";
import { SignaturePanel } from "./_components/signature-panel";

type DetailTab = "penilaian" | "foto" | "ttd";

const TABS: { id: DetailTab; label: string; Icon: typeof FileText }[] = [
  { id: "penilaian", label: "Butir Penilaian", Icon: FileText },
  { id: "foto", label: "Foto", Icon: ImageIcon },
  { id: "ttd", label: "Tanda Tangan", Icon: PenTool },
];

export default function DetailPemeriksaanPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const resultId = Number(params?.id);

  // Tab disimpan di URL agar tautan dapat dibagikan dan tombol kembali bekerja.
  const tabParam = searchParams.get("tab");
  const activeTab: DetailTab = tabParam === "foto" || tabParam === "ttd" ? tabParam : "penilaian";
  const setActiveTab = (tab: DetailTab) => {
    const next = new URLSearchParams(searchParams.toString());
    if (tab === "penilaian") next.delete("tab");
    else next.set("tab", tab);
    router.replace(`/pemeriksaan/${resultId}${next.size ? `?${next}` : ""}`, { scroll: false });
  };

  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [isPreviewingPdf, setIsPreviewingPdf] = useState(false);

  const {
    data: result,
    isLoading,
    isError,
  } = useQuery<any>({
    queryKey: ["inspection-result", resultId],
    queryFn: async () => {
      const res = await fetch(`/api/inspection/results/${resultId}`);
      if (!res.ok) throw new Error(res.status === 403 ? "Anda tidak punya akses ke hasil ini" : "Data tidak ditemukan");
      return res.json();
    },
    enabled: Number.isInteger(resultId) && resultId > 0,
  });

  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["inspection-templates"],
    queryFn: () => fetch("/api/inspection/templates").then((r) => r.json()),
  });

  // Template dari daftar lebih lengkap untuk keperluan identitas: hanya
  // proyeksi itu yang membawa subCategory.category.parameters dan
  // dataDasarCategory — keduanya sumber nilai alamat/pengelola sasaran lama
  // yang tersimpan dengan kode data_dasar_<timestamp>. Tanpa penggabungan ini
  // kolom itu selalu jatuh ke "-" padahal datanya ada.
  const template = useMemo(
    () => ({ ...result?.template, ...templates.find((t) => t.id === result?.templateId) }) as any,
    [result, templates],
  );

  const identity = useMemo(() => resolveSasaranIdentity(result, template), [result, template]);
  const photos = useMemo(() => extractInspectionPhotos(result, template), [result, template]);
  const signatures = useMemo(() => extractInspectionSignatures(result, template), [result, template]);
  const grouped = useMemo(() => groupInspectionFields(template, result), [template, result]);
  const scoreData = useMemo<ScoreData | null>(
    () => (result ? calculateInspectionScore(result, template) : null),
    [result, template],
  );

  const tanggalFormat =
    result?.tanggal || result?.createdAt
      ? new Date(result.tanggal || result.createdAt).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "-";

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

  const handlePreviewPDF = async () => {
    setIsPreviewingPdf(true);
    try {
      const res = await generateInspectionPDF(result, template, { save: false });
      if (res.blob) {
        const url = URL.createObjectURL(res.blob);
        setPreviewPdfUrl(url);
      }
    } catch (err) {
      console.error("Gagal pratinjau PDF:", err);
      toast.error("Gagal menyiapkan pratinjau PDF");
    } finally {
      setIsPreviewingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
        <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Memuat detail...</p>
      </div>
    );
  }

  if (isError || !result) {
    return (
      <div className="px-6 sm:px-8 py-16 max-w-2xl mx-auto text-center">
        <ShieldAlert className="w-10 h-10 text-muted-foreground/40 mx-auto" />
        <h1 className="text-[16px] font-black text-foreground mt-4">Detail Tidak Dapat Dibuka</h1>
        <p className="text-[13px] text-muted-foreground mt-1.5">
          Hasil pemeriksaan ini tidak ada, sudah dihapus, atau bukan milik puskesmas Anda.
        </p>
        <Link
          href="/pemeriksaan?tab=riwayat"
          className="inline-flex items-center gap-1.5 mt-5 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-[12px] font-extrabold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Riwayat
        </Link>
      </div>
    );
  }

  // Strip metrik: hitung dari tally supaya tidak duplikasi logika
  const tally = grouped.tally;
  const stripMetrics = [
    {
      label: "Sesuai",
      value: tally.sesuai,
      icon: CheckCircle2,
      colorClass: "text-success",
      bgClass: "bg-success-light border-success/20",
    },
    {
      label: "Tidak Sesuai",
      value: tally.tidak,
      icon: XCircle,
      colorClass: "text-error",
      bgClass: "bg-error-light border-error/20",
    },
    {
      label: "T/A",
      value: tally.na,
      icon: Clock,
      colorClass: "text-muted-foreground",
      bgClass: "bg-surface-subtle border-border",
    },
    {
      label: "Temuan",
      value: grouped.temuan.length,
      icon: AlertTriangle,
      colorClass: tally.tidak > 0 ? "text-warning" : "text-muted-foreground",
      bgClass: tally.tidak > 0 ? "bg-warning-light border-warning/20" : "bg-surface-subtle border-border",
    },
  ];

  return (
    <div className="w-full min-h-screen bg-canvas fade-in">
      {/* ── STICKY ACTION BAR ── */}
      <div className="sticky top-14 md:top-16 z-10 bg-surface/95 backdrop-blur-md border-b border-border">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/pemeriksaan?tab=riwayat"
              aria-label="Kembali ke daftar riwayat pemeriksaan"
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-border bg-surface hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary px-2 py-0.5 rounded-full bg-primary-subtle border border-primary/20 shrink-0">
                  Detail Pemeriksaan
                </span>
                <span className="text-[11px] text-muted-foreground tabular-nums truncate">#{result.id}</span>
              </div>
              <h1 className="text-[15px] sm:text-[18px] font-black text-foreground truncate mt-0.5">
                {identity.nama || "Sasaran Tanpa Nama"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => router.push(`/pemeriksaan?tab=riwayat&edit=${result.id}`)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-surface hover:bg-surface-subtle text-[12px] font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Edit</span>
            </button>
            <button
              type="button"
              onClick={handlePreviewPDF}
              disabled={isPreviewingPdf}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-surface hover:bg-surface-subtle text-[12px] font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] transition-colors disabled:opacity-50"
            >
              {isPreviewingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Pratinjau PDF</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isExportingPDF}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-[12px] font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] transition-all shadow-subtle disabled:opacity-50"
            >
              {isExportingPDF ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />{" "}
                  <span className="hidden sm:inline">Menyiapkan...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Unduh PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 py-6 space-y-6 [scroll-padding-top:7rem]">
        {/* ── HERO: skor besar + metadata ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-4">
          {/* Skor */}
          {scoreData && <ScoreCard scoreData={scoreData} />}

          {/* Metadata 2×2 */}
          <div className="grid grid-cols-2 gap-2.5">
            {(
              [
                { icon: Calendar, label: "Tanggal", value: tanggalFormat },
                { icon: Building2, label: "Puskesmas", value: result.puskesmas?.nama },
                { icon: User, label: "Petugas", value: identity.petugas },
                { icon: FileText, label: "Formulir", value: template?.nama },
              ] as const
            ).map((meta) => {
              const MIcon = meta.icon;
              return (
                <div
                  key={meta.label}
                  className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-surface min-w-0 shadow-subtle"
                >
                  <span className="w-8 h-8 rounded-lg bg-primary-subtle border border-primary/15 flex items-center justify-center shrink-0">
                    <MIcon className="w-3.5 h-3.5 text-primary" />
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

        {/* ── STRIP METRIK: 4 pil besar sebelum daftar butir ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stripMetrics.map(({ label, value, icon: Icon, colorClass, bgClass }) => (
            <div
              key={label}
              className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border shadow-subtle ${bgClass}`}
            >
              <Icon className={`w-5 h-5 ${colorClass}`} aria-hidden="true" />
              <span className={`text-[22px] font-black tabular-nums leading-none ${colorClass}`}>{value}</span>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground text-center">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* ── TAB: segmented control ── */}
        <div
          role="tablist"
          aria-label="Bagian detail pemeriksaan"
          className="flex items-center gap-1 p-1 rounded-2xl bg-surface-subtle border border-border w-full overflow-x-auto"
        >
          {TABS.map(({ id, label, Icon }) => {
            const selected = activeTab === id;
            const count = id === "foto" ? photos.length : undefined;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                id={`tab-${id}`}
                aria-selected={selected}
                aria-controls={`panel-${id}`}
                onClick={() => setActiveTab(id)}
                className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl text-[12px] font-bold whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] transition-all ${
                  selected
                    ? "bg-surface text-foreground shadow-subtle border border-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface"
                }`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {label}
                {count !== undefined && <span className="tabular-nums">({count})</span>}
              </button>
            );
          })}
        </div>

        {/* ── TAB PENILAIAN ── */}
        {activeTab === "penilaian" && (
          <div role="tabpanel" id="panel-penilaian" aria-labelledby="tab-penilaian" className="space-y-6">
            <TemuanList temuan={grouped.temuan} />
            <SasaranProfileCard identity={identity} />
            {grouped.groups.length === 0 ? (
              <EmptyChecklist />
            ) : (
              <ChecklistGroups
                groups={grouped.groups}
                values={result.values}
                onPreviewPhoto={(url) => {
                  const idx = photos.findIndex((p) => p.url === url);
                  if (idx >= 0) setPreviewIndex(idx);
                }}
              />
            )}
          </div>
        )}

        {/* ── TAB FOTO ── */}
        {activeTab === "foto" && (
          <div role="tabpanel" id="panel-foto" aria-labelledby="tab-foto">
            <PhotoGallery
              photos={photos}
              onPreview={(url) =>
                setPreviewIndex(
                  Math.max(
                    0,
                    photos.findIndex((p) => p.url === url),
                  ),
                )
              }
            />
          </div>
        )}

        {/* ── TAB TANDA TANGAN ── */}
        {activeTab === "ttd" && (
          <div role="tabpanel" id="panel-ttd" aria-labelledby="tab-ttd">
            <SignaturePanel
              petugas={identity.petugas}
              petugasSignature={signatures.petugas}
              pemilik={identity.pemilik}
              pemilikSignature={signatures.pemilik}
              sasaranNama={identity.nama}
              puskesmasNama={result.puskesmas?.nama || "Puskesmas"}
              tanggalFormat={tanggalFormat}
            />
          </div>
        )}
      </div>

      {previewIndex !== null && photos[previewIndex] && (
        <PhotoLightbox
          photos={photos}
          index={previewIndex}
          onIndexChange={setPreviewIndex}
          onClose={() => setPreviewIndex(null)}
        />
      )}

      {previewPdfUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 fade-in">
          <div className="w-full max-w-4xl h-[88vh] flex flex-col rounded-card bg-surface border border-border shadow-float overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-surface shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-extrabold text-foreground">Pratinjau Berita Acara IKL</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(previewPdfUrl);
                  setPreviewPdfUrl(null);
                }}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 bg-muted/30">
              <PdfViewer
                url={previewPdfUrl}
                title="Berita Acara IKL"
                className="h-full border-0 rounded-none shadow-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
