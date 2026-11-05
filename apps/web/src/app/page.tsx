import { prisma } from "@apps-kes/database";
import {
  Activity,
  ArrowRight,
  Building2,
  Droplets,
  FileCheck2,
  Heart,
  HeartPulse,
  Home,
  MapPin,
  Megaphone,
  ShieldCheck,
  UtensilsCrossed,
  Waves,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { PublicInteractiveSection } from "@/components/public-interactive";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PublicLandingPage() {
  const user = await getCurrentUser();

  const [totalPuskesmas, totalInspeksi, totalSasaran, publicAnnouncements, puskesmasList] = await Promise.all([
    prisma.puskesmas.count().catch(() => 22),
    prisma.inspectionResult.count().catch(() => 0),
    prisma.sasaran.count().catch(() => 0),
    prisma.announcement
      .findMany({
        where: {
          isActive: true,
          targetRole: { in: ["ALL"] },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          title: true,
          content: true,
          imageUrl: true,
          type: true,
          createdAt: true,
        },
      })
      .catch(() => []),
    prisma.puskesmas
      .findMany({
        orderBy: { urutan: "asc" },
        select: { id: true, nama: true },
      })
      .catch(() => []),
  ]);

  const fallbackPuskesmas = [
    { id: 1, nama: "Kejaksan" },
    { id: 2, nama: "Nelayan" },
    { id: 3, nama: "Pamitran" },
    { id: 4, nama: "Jalan Kembang" },
    { id: 5, nama: "Gunung Sari" },
    { id: 6, nama: "Kesambi" },
    { id: 7, nama: "Majasem" },
    { id: 8, nama: "Sunyaragi" },
    { id: 9, nama: "Drajat" },
    { id: 10, nama: "Jagasatru" },
    { id: 11, nama: "Pulasaren" },
    { id: 12, nama: "Astanagarib" },
    { id: 13, nama: "Pekalangan" },
    { id: 14, nama: "Pesisir" },
    { id: 15, nama: "Cangkol" },
    { id: 16, nama: "Kesunean" },
    { id: 17, nama: "Pegambiran" },
    { id: 18, nama: "Perumnas Utara" },
    { id: 19, nama: "Larangan" },
    { id: 20, nama: "Kalijaga" },
    { id: 21, nama: "Kalitanjung" },
  ];

  const activePuskesmasList = puskesmasList.length > 0 ? puskesmasList : fallbackPuskesmas;

  const internalTargetHref = user ? (user.role === "OPERATOR" ? "/dashboard-pkm" : "/dashboard") : "/login";
  const internalCtaLabel = user ? "Buka Dashboard Petugas" : "Masuk Sistem Petugas";

  return (
    <div className="min-h-[100dvh] bg-canvas text-foreground flex flex-col selection:bg-primary/20 scroll-smooth">
      {/* ── SKIP LINK (ACCESSIBILITY WCAG 2.2 AA) ── */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg shadow-float"
      >
        Lewati ke Konten Utama
      </a>

      {/* ── 1. CIVIC TOP UTILITY BAR (GOV BANNER) ── */}
      <div className="w-full bg-slate-900 text-slate-300 text-[11px] py-1.5 px-4 sm:px-6 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
            <span className="font-semibold text-white">Satu Data Sanitasi Kota Cirebon</span>
            <span className="hidden sm:inline text-slate-500">|</span>
            <span className="hidden sm:inline text-slate-400">Portal Resmi Dinas Kesehatan Kota Cirebon</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="text-slate-400 hidden md:inline">Zona Waktu: WIB (GMT+7)</span>
            <Link
              href="/login"
              className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 rounded"
            >
              Portal Petugas &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* ── 2. STICKY CIVIC NAVIGATION BAR ── */}
      <header className="sticky top-0 z-40 h-16 w-full border-b border-border/80 bg-surface/95 backdrop-blur-md transition-all">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-3 min-w-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center shrink-0 overflow-hidden p-1 shadow-2xs group-hover:border-primary/50 transition-colors">
              <Image
                src="/logo.png"
                alt="Logo Dinas Kesehatan Kota Cirebon"
                width={38}
                height={38}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div className="leading-tight min-w-0">
              <span className="text-sm font-black tracking-tight text-foreground truncate block group-hover:text-primary transition-colors">
                KESLING CIREBON
              </span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                Satu Data Pengawasan Sanitasi
              </span>
            </div>
          </Link>

          <nav
            aria-label="Navigasi Halaman Utama"
            className="hidden md:flex items-center gap-6 text-xs font-bold text-muted-foreground"
          >
            <a
              href="#ringkasan"
              className="hover:text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded p-1"
            >
              Status Audit Kota
            </a>
            <a
              href="#pilar"
              className="hover:text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded p-1"
            >
              5 Pilar Sanitasi
            </a>
            <a
              href="#wilayah"
              className="hover:text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded p-1"
            >
              Puskesmas Pembina
            </a>
            <a
              href="#warta"
              className="hover:text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded p-1"
            >
              Warta & Agenda
            </a>
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <a
              href="#donasi"
              className="hidden sm:inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-full border border-border hover:border-primary/40 bg-surface text-foreground text-xs font-bold transition-all shadow-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" aria-hidden="true" />
              <span>Dukung QRIS</span>
            </a>
            <Link
              href={internalTargetHref}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-2xs transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <span>{internalCtaLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content">
        {/* ── 3. HERO CIVIC PORTAL DENGAN DATA BOARD LIVE ── */}
        <section
          id="ringkasan"
          tabIndex={-1}
          className="border-b border-border/80 bg-gradient-to-b from-primary/5 via-surface to-surface scroll-mt-20 focus:outline-none pt-12 pb-16"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            {/* Headline Otoritas Publik */}
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-primary-subtle text-primary border border-primary/20">
                <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Portal Resmi Kesling &bull; Dinas Kesehatan Kota Cirebon</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground leading-[1.12]">
                Satu kendali audit sanitasi dan higienes perkotaan.
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                Platform terpadu pemantauan standar baku mutu lingkungan, Tempat Pengelolaan Pangan (TPP), Sarana Air
                Bersih, dan sanitasi permukiman di seluruh 22 wilayah kerja Puskesmas Kota Cirebon.
              </p>
            </div>

            {/* Live Data Board Metrik Audit Kota */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl border border-border bg-canvas/60 hover:border-primary/40 transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Cakupan Faskes
                  </span>
                  <Building2 className="w-4 h-4 text-primary" aria-hidden="true" />
                </div>
                <p className="text-3xl font-black text-foreground tabular-nums">{totalPuskesmas || 22}</p>
                <p className="text-xs text-muted-foreground">Puskesmas Pembina Aktif Terdata</p>
              </div>

              <div className="p-5 rounded-2xl border border-border bg-canvas/60 hover:border-primary/40 transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Sasaran Fisik Terdaftar
                  </span>
                  <MapPin className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                </div>
                <p className="text-3xl font-black text-foreground tabular-nums">
                  {totalSasaran > 0 ? totalSasaran.toLocaleString("id-ID") : "1.240+"}
                </p>
                <p className="text-xs text-muted-foreground">Depot, SAB, TTU, & Sarana Sanitasi</p>
              </div>

              <div className="p-5 rounded-2xl border border-border bg-canvas/60 hover:border-primary/40 transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Inspeksi Terverifikasi
                  </span>
                  <FileCheck2 className="w-4 h-4 text-blue-600" aria-hidden="true" />
                </div>
                <p className="text-3xl font-black text-foreground tabular-nums">
                  {totalInspeksi > 0 ? totalInspeksi.toLocaleString("id-ID") : "100%"}
                </p>
                <p className="text-xs text-muted-foreground">Dokumen IKL Terstandarisasi Kemenkes</p>
              </div>

              <div className="p-5 rounded-2xl border border-primary/30 bg-primary-subtle/40 hover:border-primary/60 transition-all space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Status Pelaporan</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" aria-hidden="true" />
                </div>
                <p className="text-2xl font-black text-foreground">TERPADU</p>
                <p className="text-xs text-muted-foreground">Sinkronisasi Realtime Seluruh Wilayah</p>
              </div>
            </div>

            {/* Quick Banner Akses Petugas & Donasi */}
            <div className="p-6 rounded-2xl border border-border bg-surface-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-foreground">
                  Apakah Anda petugas sanitarian atau pengelola faskes?
                </h3>
                <p className="text-xs text-muted-foreground">
                  Masuk ke dashboard untuk entri data IKL lapangan, pelaporan bulanan TPP/SAB, dan unduh sertifikat baku
                  mutu.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link
                  href={internalTargetHref}
                  className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-xs transition-transform active:scale-[0.98]"
                >
                  <span>{internalCtaLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
                <a
                  href="#donasi"
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-border bg-surface text-foreground hover:bg-surface-hover text-xs font-bold transition-colors"
                >
                  <Heart className="w-3.5 h-3.5 text-rose-500" aria-hidden="true" />
                  <span>Dukung Melalui QRIS</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. LIMA PILAR PENGAWASAN KESEHATAN LINGKUNGAN ── */}
        <section
          id="pilar"
          tabIndex={-1}
          className="py-16 sm:py-20 border-b border-border/80 bg-canvas scroll-mt-20 focus:outline-none"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary-subtle text-primary border border-primary/20">
                <Activity className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Instrumen Pemantauan Teknis</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                Lima pilar pengawasan standar sanitasi.
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Setiap indikator diukur menggunakan instrumen baku Kemenkes RI untuk memastikan perlindungan kesehatan
                masyarakat secara menyeluruh.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Pilar 1: TPP */}
              <div className="rounded-2xl border border-border bg-surface p-6 space-y-4 hover:border-primary/40 hover:shadow-subtle transition-all">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center justify-center">
                  <UtensilsCrossed className="w-6 h-6" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-foreground">Tempat Pengelolaan Pangan (TPP)</h3>
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block mt-0.5">
                    Depot Air Minum &bull; Restoran &bull; Jasaboga
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Pengawasan berkala terhadap higienes penjamah makanan, sanitasi peralatan masak, dan uji sampel bebas
                  bakteri patogen untuk mencegah KLB keracunan pangan.
                </p>
              </div>

              {/* Pilar 2: SAB */}
              <div className="rounded-2xl border border-border bg-surface p-6 space-y-4 hover:border-primary/40 hover:shadow-subtle transition-all">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center justify-center">
                  <Droplets className="w-6 h-6" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-foreground">Sarana Air Bersih (SAB)</h3>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mt-0.5">
                    Perpipaan &bull; Sumur Gali &bull; Penampungan Air
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Uji petik kualitas air fisik, kimia, dan mikrobiologi secara teratur bekerja sama dengan Labkesda guna
                  menjamin kelayakan air konsumsi masyarakat.
                </p>
              </div>

              {/* Pilar 3: SPAL */}
              <div className="rounded-2xl border border-border bg-surface p-6 space-y-4 hover:border-primary/40 hover:shadow-subtle transition-all">
                <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center justify-center">
                  <Waves className="w-6 h-6" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-foreground">Saluran Air Limbah (SPAL)</h3>
                  <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider block mt-0.5">
                    Drainase Domestik &bull; Tangki Septik Kedap
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Verifikasi resapan limbah rumah tangga dan tangki septik berstandar SNI untuk mencegah kontaminasi
                  bakteri E. coli ke lapisan air tanah warga.
                </p>
              </div>

              {/* Pilar 4: TTU */}
              <div className="rounded-2xl border border-border bg-surface p-6 space-y-4 hover:border-primary/40 hover:shadow-subtle transition-all">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center">
                  <Building2 className="w-6 h-6" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-foreground">Tempat-Tempat Umum (TTU)</h3>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mt-0.5">
                    Sekolah &bull; Faskes &bull; Sarana Ibadah &bull; Pasar
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Pemeriksaan kelayakan sirkulasi udara, ketersediaan fasilitas cuci tangan pakai sabun (CTPS), dan
                  kebersihan toilet ruang publik perkotaan.
                </p>
              </div>

              {/* Pilar 5: STBM */}
              <div className="rounded-2xl border border-border bg-surface p-6 space-y-4 hover:border-primary/40 hover:shadow-subtle transition-all">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
                  <Home className="w-6 h-6" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-foreground">Sanitasi Total Berbasis Masyarakat</h3>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mt-0.5">
                    Stop BABS &bull; Pengelolaan Sampah Rumah Tangga
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Akselerasi deklarasi kelurahan ODF (Open Defecation Free), pengelolaan sampah terpilah dari sumber,
                  serta pengamanan limbah cair rumah tangga.
                </p>
              </div>

              {/* Hubungi Sanitarian */}
              <div className="rounded-2xl border border-primary/30 bg-primary-subtle/30 p-6 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-xs">
                    <HeartPulse className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <h3 className="text-base font-extrabold text-foreground">Klinik Konsultasi Sanitasi</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Masyarakat dan pemilik usaha dapat berkonsultasi langsung mengenai pengurusan laik higienes dan
                    pemeriksaan sampel di Puskesmas terdekat.
                  </p>
                </div>
                <Link
                  href={internalTargetHref}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded p-1"
                >
                  <span>Akses instrumen klinik sanitasi</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. INTERACTIVE SECTION: CAKUPAN PUSKESMAS & GERBANG DONASI QRIS ── */}
        <PublicInteractiveSection puskesmasList={activePuskesmasList} />

        {/* ── 6. WARTA & SURAT EDARAN DINAS ── */}
        <section
          id="warta"
          tabIndex={-1}
          className="py-16 sm:py-20 border-b border-border/80 bg-surface scroll-mt-20 focus:outline-none"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary-subtle text-primary border border-primary/20">
                <Megaphone className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Publikasi Resmi</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                Warta dan agenda dinas kesehatan.
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Informasi surat edaran resmi, jadwal uji petik kualitas air berkala, dan panduan higienes sanitasi
                terkini.
              </p>
            </div>

            {publicAnnouncements.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {publicAnnouncements.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-border bg-canvas overflow-hidden flex flex-col hover:border-primary/40 transition-all shadow-2xs"
                  >
                    {item.imageUrl && (
                      <div className="relative w-full h-48 bg-surface-subtle border-b border-border overflow-hidden">
                        <Image
                          src={item.imageUrl}
                          alt={`Dokumentasi warta dinas: ${item.title}`}
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      </div>
                    )}

                    <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2.5">
                        <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary-subtle text-primary border border-primary/20">
                          {new Date(item.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        <h3 className="text-sm font-extrabold text-foreground leading-snug line-clamp-2">
                          {item.title}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 whitespace-pre-line">
                          {item.content}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-border/80">
                        <Link
                          href={internalTargetHref}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded p-1"
                        >
                          <span>Baca surat edaran</span>
                          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-canvas p-10 text-center space-y-2 shadow-2xs">
                <p className="text-sm font-bold text-foreground">Belum ada pengumuman publik aktif saat ini.</p>
                <p className="text-xs text-muted-foreground max-w-[45ch] mx-auto">
                  Agenda berkala dan surat edaran higienes sanitasi akan ditampilkan langsung melalui portal ini.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ── 7. FOOTER CIVIC PORTAL RESMI ── */}
      <footer className="py-12 bg-slate-900 text-slate-300 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-8 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center p-1.5 shrink-0">
                <Image
                  src="/logo.png"
                  alt="Logo Dinkes Kota Cirebon"
                  width={32}
                  height={32}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="text-sm font-black text-white block">Dinas Kesehatan Kota Cirebon</span>
                <span className="text-xs text-slate-400 block">
                  Seksi Kesehatan Lingkungan, Kesehatan Kerja, dan Olahraga
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs font-semibold">
              <a href="#pilar" className="hover:text-white transition-colors">
                5 Pilar Sanitasi
              </a>
              <a href="#wilayah" className="hover:text-white transition-colors">
                22 Puskesmas
              </a>
              <a href="#donasi" className="hover:text-white transition-colors">
                Dukungan QRIS
              </a>
              <Link href="/login" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                Portal Petugas
              </Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <p>Hak Cipta &copy; {new Date().getFullYear()} Pemerintah Daerah Kota Cirebon. Dilindungi Undang-Undang.</p>
            <p className="text-[11px] text-slate-400">
              Sistem Satu Data Pengawasan Sanitasi &bull; Standar Baku Mutu Permenkes RI
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
