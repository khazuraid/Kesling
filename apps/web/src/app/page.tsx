import { prisma } from "@apps-kes/database";
import {
  Activity,
  ArrowRight,
  Building2,
  Droplets,
  Heart,
  HeartPulse,
  Home,
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
  const internalCtaLabel = user ? "Buka Dashboard" : "Masuk Petugas";

  return (
    <div className="min-h-[100dvh] bg-canvas text-foreground flex flex-col selection:bg-primary/20 scroll-smooth">
      {/* ── SKIP TO MAIN CONTENT UNTUK ACCESSIBILITY ── */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg shadow-float"
      >
        Lewati ke Konten Utama
      </a>

      {/* ── 1. HEADER NAVIGASI ONE-PAGE STICKY ── */}
      <header className="sticky top-0 z-40 h-16 w-full border-b border-border/80 bg-surface/90 backdrop-blur-xl transition-all">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 min-w-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
          >
            <div className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center shrink-0 overflow-hidden p-1 shadow-2xs group-hover:border-primary/50 transition-colors">
              <Image
                src="/logo.png"
                alt="Logo Dinas Kesehatan Kota Cirebon"
                width={36}
                height={36}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div className="leading-tight min-w-0">
              <span className="text-sm font-extrabold tracking-tight text-foreground truncate block group-hover:text-primary transition-colors">
                Kesling Cirebon
              </span>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                Dinas Kesehatan Kota
              </span>
            </div>
          </Link>

          <nav
            aria-label="Navigasi Halaman Utama"
            className="hidden md:flex items-center gap-7 text-xs font-bold text-muted-foreground"
          >
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
              Cakupan Wilayah
            </a>
            <a
              href="#warta"
              className="hover:text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded p-1"
            >
              Warta & Agenda
            </a>
            <a
              href="#donasi"
              className="hover:text-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded p-1"
            >
              Dukungan QRIS
            </a>
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <a
              href="#donasi"
              className="hidden sm:inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-full border border-border hover:border-primary/40 bg-surface text-foreground text-xs font-bold transition-all shadow-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" aria-hidden="true" />
              <span>Donasi</span>
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

      {/* ── 2. HERO ONE-PAGE DENGAN LIVE STATS BENTO ── */}
      <main id="main-content">
        <section className="relative min-h-[calc(100dvh-4rem)] flex items-center border-b border-border/80 overflow-hidden pt-10 pb-16 bg-gradient-to-b from-canvas via-canvas to-surface/40">
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              {/* Sisi Kiri: Narasi Utama & Action Button */}
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary-subtle text-primary border border-primary/20">
                  <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Portal Resmi Sanitasi & Kesehatan Lingkungan Kota Cirebon</span>
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[52px] font-black tracking-tight text-foreground leading-[1.14]">
                  Satu kendali data sanitasi & higienes perkotaan.
                </h1>

                <p className="text-base sm:text-lg text-muted-foreground max-w-[54ch] leading-relaxed">
                  Pemantauan terpadu 5 pilar kesehatan lingkungan di 22 wilayah kerja Puskesmas Kota Cirebon secara
                  akuntabel, real-time, dan terbuka untuk masyarakat.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    href={internalTargetHref}
                    className="inline-flex items-center gap-2 min-h-[44px] px-6 rounded-full bg-primary hover:bg-primary-hover text-white text-sm font-bold shadow-xs transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <span>{internalCtaLabel}</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>

                  <a
                    href="#donasi"
                    className="inline-flex items-center gap-2 min-h-[44px] px-5 rounded-full border border-primary/20 bg-primary-subtle/40 text-primary hover:bg-primary-subtle text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <Heart className="w-4 h-4 fill-primary" aria-hidden="true" />
                    <span>Dukung QRIS</span>
                  </a>

                  <a
                    href="#pilar"
                    className="inline-flex items-center gap-2 min-h-[44px] px-5 rounded-full border border-border bg-surface text-foreground hover:bg-surface-subtle text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <span>Eksplorasi 5 Pilar</span>
                  </a>
                </div>
              </div>

              {/* Sisi Kanan: Kartu Realtime Metrik Perkotaan */}
              <div className="lg:col-span-5">
                <div className="rounded-2xl border border-border bg-surface p-6 sm:p-7 shadow-subtle space-y-5">
                  <div className="flex items-center justify-between pb-4 border-b border-border">
                    <div className="flex items-center gap-2.5">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Status Sinkronisasi Kota
                      </span>
                    </div>
                    <span className="text-xs font-extrabold text-primary">LIVE REAL-TIME</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="p-4 rounded-xl bg-surface-subtle border border-border/80">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Fasilitas Sanitasi
                      </p>
                      <p className="text-2xl sm:text-3xl font-black text-foreground mt-1 tabular-nums">
                        {totalSasaran > 0 ? totalSasaran.toLocaleString("id-ID") : "1.240+"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Sasaran fisik terdaftar</p>
                    </div>

                    <div className="p-4 rounded-xl bg-surface-subtle border border-border/80">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Wilayah Kerja
                      </p>
                      <p className="text-2xl sm:text-3xl font-black text-foreground mt-1 tabular-nums">
                        {totalPuskesmas || 22}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Puskesmas se-kota</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-primary/25 bg-primary-subtle/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Inspeksi Kesehatan Lingkungan (IKL)</span>
                      <span className="text-xs font-black text-primary tabular-nums">
                        {totalInspeksi > 0 ? `${totalInspeksi.toLocaleString("id-ID")} Dokumen` : "Aktif Berjalan"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Standar baku mutu diverifikasi langsung di lapangan oleh sanitarian profesional Dinas Kesehatan
                      Kota Cirebon.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. LIMA PILAR POKOK KESEHATAN LINGKUNGAN ── */}
        <section
          id="pilar"
          tabIndex={-1}
          className="py-16 sm:py-20 border-b border-border/80 bg-surface/50 scroll-mt-20 focus:outline-none"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary-subtle text-primary border border-primary/20">
                <Activity className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Fokus Program</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
                Lima pilar pemantauan sanitasi kota.
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Instrumen pengawasan rutin terhadap sarana umum, pangan, air baku, limbah, dan perumahan masyarakat.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-border bg-surface p-6 space-y-3.5 shadow-2xs hover:border-primary/40 transition-all">
                <div className="w-11 h-11 rounded-xl bg-primary-subtle text-primary border border-primary/20 flex items-center justify-center">
                  <UtensilsCrossed className="w-5 h-5" aria-hidden="true" />
                </div>
                <h3 className="text-base font-extrabold text-foreground">Tempat Pengelolaan Pangan (TPP)</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Pengawasan higienes depot air minum, restoran, jasaboga, dan sentra kantin jajanan untuk mencegah
                  risiko keracunan pangan massal.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-surface p-6 space-y-3.5 shadow-2xs hover:border-primary/40 transition-all">
                <div className="w-11 h-11 rounded-xl bg-primary-subtle text-primary border border-primary/20 flex items-center justify-center">
                  <Droplets className="w-5 h-5" aria-hidden="true" />
                </div>
                <h3 className="text-base font-extrabold text-foreground">Sarana Air Bersih (SAB)</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Pemeriksaan kualitas fisik dan mikrobiologis pada sumur gali terlindung, sumur bor, dan jaringan
                  perpipaan air minum warga.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-surface p-6 space-y-3.5 shadow-2xs hover:border-primary/40 transition-all">
                <div className="w-11 h-11 rounded-xl bg-primary-subtle text-primary border border-primary/20 flex items-center justify-center">
                  <Waves className="w-5 h-5" aria-hidden="true" />
                </div>
                <h3 className="text-base font-extrabold text-foreground">Saluran Pembuangan Air Limbah (SPAL)</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Pemantauan teknis riool kota, tangki septik aman, dan resapan air limbah domestik bebas genangan
                  pencemar lingkungan.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-surface p-6 space-y-3.5 shadow-2xs hover:border-primary/40 transition-all">
                <div className="w-11 h-11 rounded-xl bg-primary-subtle text-primary border border-primary/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5" aria-hidden="true" />
                </div>
                <h3 className="text-base font-extrabold text-foreground">Tempat-Tempat Umum (TTU)</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Standarisasi sanitasi fasilitas pelayanan kesehatan, sekolah, sarana ibadah, dan pasar demi keamanan
                  ruang publik bersama.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-surface p-6 space-y-3.5 shadow-2xs hover:border-primary/40 transition-all">
                <div className="w-11 h-11 rounded-xl bg-primary-subtle text-primary border border-primary/20 flex items-center justify-center">
                  <Home className="w-5 h-5" aria-hidden="true" />
                </div>
                <h3 className="text-base font-extrabold text-foreground">Rumah Sehat & Sanitasi Total (STBM)</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Verifikasi jamban keluarga sehat, ventilasi hunian, pengelolaan sampah terpilah, dan stop buang air
                  besar sembarangan.
                </p>
              </div>

              <div className="rounded-2xl border border-primary/30 bg-primary-subtle/30 p-6 space-y-3.5 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center shadow-xs">
                    <HeartPulse className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <h3 className="text-base font-extrabold text-foreground">Layanan Terpadu Sanitarian</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Konsultasi klinik sanitasi dan uji baku mutu sampel terhubung langsung ke jejaring laboratorium
                    daerah Kota Cirebon.
                  </p>
                </div>

                <div className="pt-2">
                  <Link
                    href={internalTargetHref}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded p-1"
                  >
                    <span>Buka instrumen operasional</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 4 & 5. INTERACTIVE SECTION: CAKUPAN WILAYAH + DONASI QRIS SUMOPOD ── */}
        <PublicInteractiveSection puskesmasList={activePuskesmasList} />

        {/* ── 6. WARTA & PENGUMUMAN PUBLIK ── */}
        <section
          id="warta"
          tabIndex={-1}
          className="py-16 sm:py-20 border-b border-border/80 bg-surface/50 scroll-mt-20 focus:outline-none"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary-subtle text-primary border border-primary/20">
                <Megaphone className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Warta Dinas</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
                Pengumuman dan agenda dinas.
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Informasi surat edaran, uji petik kualitas air, dan panduan higienes sanitasi terkini bagi masyarakat
                umum.
              </p>
            </div>

            {publicAnnouncements.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {publicAnnouncements.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-border bg-surface overflow-hidden flex flex-col shadow-2xs hover:border-primary/40 transition-all"
                  >
                    {item.imageUrl && (
                      <div className="relative w-full h-48 bg-surface-subtle border-b border-border overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.imageUrl}
                          alt={`Dokumentasi warta dinas: ${item.title}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
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
                        <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug line-clamp-2">
                          {item.title}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 whitespace-pre-line">
                          {item.content}
                        </p>
                      </div>

                      <div className="pt-2">
                        <Link
                          href={internalTargetHref}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded p-1"
                        >
                          <span>Lihat detail surat edaran</span>
                          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-surface p-10 text-center space-y-2 shadow-2xs">
                <p className="text-sm font-bold text-foreground">Belum ada pengumuman publik aktif saat ini.</p>
                <p className="text-xs text-muted-foreground max-w-[45ch] mx-auto">
                  Agenda berkala dan surat edaran higienes sanitasi akan ditampilkan langsung melalui portal ini.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ── 7. FOOTER ONE-PAGE PUBLIK ── */}
      <footer className="py-12 bg-surface text-foreground border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-surface border border-border flex items-center justify-center p-1 shrink-0">
              <Image
                src="/logo.png"
                alt="Logo Dinas Kesehatan Kota Cirebon"
                width={28}
                height={28}
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-medium">
              Hak Cipta © {new Date().getFullYear()} Dinas Kesehatan Kota Cirebon. Seluruh hak cipta dilindungi.
            </span>
          </div>

          <div className="flex items-center gap-6 font-bold">
            <a
              href="#pilar"
              className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded p-1"
            >
              Pilar Sanitasi
            </a>
            <a
              href="#donasi"
              className="hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded p-1"
            >
              Donasi QRIS
            </a>
            <Link
              href="/login"
              className="hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded p-1"
            >
              Masuk Petugas
            </Link>
            <Link
              href="/register"
              className="hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded p-1"
            >
              Pendaftaran Sanitarian
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
