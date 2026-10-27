"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Download,
  Edit3,
  FileText,
  ImageIcon,
  Loader2,
  PenTool,
  ShieldAlert,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { groupInspectionFields } from "@/lib/inspection-answers";
import { extractInspectionPhotos, extractInspectionSignatures } from "@/lib/inspection-media";
import { resolveSasaranIdentity } from "@/lib/sasaran-meta";
import { calculateInspectionScore, generateInspectionPDF } from "../pdf-generator";
import { AnswerTally, ChecklistGroups, EmptyChecklist, TemuanList } from "./_components/checklist-panel";
import { PhotoGallery } from "./_components/photo-gallery";
import { PhotoLightbox } from "./_components/photo-lightbox";
import { SasaranProfileCard } from "./_components/sasaran-profile-card";
import { ScoreCard, type ScoreData } from "./_components/score-card";
import { SignaturePanel } from "./_components/signature-panel";

type DetailTab = "penilaian" | "foto" | "ttd";

const TABS: { id: DetailTab; label: string; Icon: typeof FileText }[] = [
  { id: "penilaian", label: "Butir", Icon: FileText },
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

  const metaInfo = [
    { icon: Calendar, label: "Tanggal", value: tanggalFormat },
    { icon: Building2, label: "Puskesmas", value: result.puskesmas?.nama },
    { icon: User, label: "Petugas", value: identity.petugas },
    { icon: FileText, label: "Formulir", value: template?.nama },
  ];

  return (
    <div className="w-full min-h-screen bg-canvas fade-in">
      {/* Bar halaman: menempel di bawah header (mobile 3.5rem / desktop 4rem) dan
          sengaja z-10 supaya header tetap di atasnya. Padding gulir pada
          pembungkusnya mencegah header menutupi elemen yang difokuskan. */}
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
              <h1 className="text-[16px] sm:text-[19px] font-black text-foreground truncate mt-0.5">
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
              <Edit3 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Edit Pemeriksaan</span>
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

      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-8 py-6 space-y-5 [scroll-padding-top:7rem]">
        {/* Ringkasan skor + metadata */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-3.5">
          {scoreData && <ScoreCard scoreData={scoreData} />}
          <div className="grid grid-cols-2 gap-2">
            {metaInfo.map((meta) => {
              const MIcon = meta.icon;
              return (
                <div
                  key={meta.label}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border bg-surface-subtle/60 min-w-0"
                >
                  <span className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0">
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

        {/* Tab: segmented control, dapat dijangkau papan ketik dan dibaca layar */}
        <div
          role="tablist"
          aria-label="Bagian detail pemeriksaan"
          className="flex items-center gap-1 p-1 rounded-2xl bg-muted w-full overflow-x-auto"
        >
          {TABS.map(({ id, label, Icon }) => {
            const selected = activeTab === id;
            const count = id === "penilaian" ? grouped.fields.length : id === "foto" ? photos.length : undefined;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                id={`tab-${id}`}
                aria-selected={selected}
                aria-controls={`panel-${id}`}
                onClick={() => setActiveTab(id)}
                className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-[12px] font-bold whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] transition-all ${
                  selected ? "bg-card text-foreground shadow-subtle" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {label}
                {count !== undefined && <span className="tabular-nums">({count})</span>}
              </button>
            );
          })}
        </div>

        {activeTab === "penilaian" && (
          <div role="tabpanel" id="panel-penilaian" aria-labelledby="tab-penilaian" className="space-y-5">
            <AnswerTally tally={grouped.tally} />
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
    </div>
  );
}
