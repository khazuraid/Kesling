import { prisma } from "@apps-kes/database";
import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  Droplets,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  HeartPulse,
  Home,
  Layers,
  MapPin,
  ShieldCheck,
  Sparkles,
  UtensilsCrossed,
  Waves,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
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

  const fallbackPuskesmasNames = [
    "Kejaksan",
    "Nelayan",
    "Pamitran",
    "Jalan Kembang",
    "Gunung Sari",
    "Kesambi",
    "Majasem",
    "Sunyaragi",
    "Drajat",
    "Jagasatru",
    "Pulasaren",
    "Astanagarib",
    "Pekalangan",
    "Pesisir",
    "Cangkol",
    "Kesunean",
    "Pegambiran",
    "Perumnas Utara",
    "Larangan",
    "Kalijaga",
    "Kalitanjung",
  ];

  const activePuskesmas = puskesmasList.length > 0 ? puskesmasList.map((p) => p.nama) : fallbackPuskesmasNames;

  const internalTargetHref = user ? (user.role === "OPERATOR" ? "/dashboard-pkm" : "/dashboard") : "/login";

  const internalCtaLabel = user ? "Buka Dashboard" : "Masuk Petugas";

  return (
    <div className="min-h-[100dvh] bg-canvas text-foreground flex flex-col selection:bg-primary/20">
      {/* 1. Header Navigasi Satu Baris */}
      <header className="sticky top-0 z-40 h-16 w-full border-b border-border/80 bg-surface/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center shrink-0 overflow-hidden p-1 shadow-2xs">
              <Image
                src="/logo.png"
                alt="Logo Kesling Cirebon"
                width={36}
                height={36}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div className="leading-tight min-w-0">
              <span className="text-sm font-extrabold tracking-tight text-foreground truncate block">
                Kesling Cirebon
              </span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Dinas Kesehatan Kota
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-muted-foreground">
            <a href="#pilar" className="hover:text-foreground transition-colors">
              5 Pilar Sanitasi
            </a>
            <a href="#wilayah" className="hover:text-foreground transition-colors">
              Cakupan Wilayah
            </a>
            <a href="#pengumuman" className="hover:text-foreground transition-colors">
              Warta Publik
            </a>
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href={internalTargetHref}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-button bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-2xs transition-transform active:scale-[0.98]"
            >
              <span>{internalCtaLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Asimetris Terbatas Viewport */}
      <section className="relative min-h-[calc(100dvh-4rem)] flex items-center border-b border-border/70 overflow-hidden pt-6 pb-12">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Sisi Kiri: Deskripsi Program & Akses */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary-subtle text-primary border border-primary/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Portal Resmi Kesehatan Lingkungan Kota Cirebon</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-black tracking-tight text-foreground leading-[1.12]">
                Satu kendali data sanitasi dan higienes fasilitas perkotaan.
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground max-w-[54ch] leading-relaxed">
                Pemantauan terpadu 5 pilar kesehatan lingkungan di 22 wilayah kerja Puskesmas Kota Cirebon secara
                transparan.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href={internalTargetHref}
                  className="inline-flex items-center gap-2 h-11 px-6 rounded-button bg-primary hover:bg-primary-hover text-white text-sm font-bold shadow-xs transition-transform active:scale-[0.98]"
                >
                  <span>{internalCtaLabel}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <a
                  href="#pilar"
                  className="inline-flex items-center gap-2 h-11 px-5 rounded-button border border-border bg-surface text-foreground hover:bg-surface-subtle text-sm font-semibold transition-colors"
                >
                  <span>Eksplorasi Program</span>
                </a>
              </div>
            </div>

            {/* Sisi Kanan: Kartu Realtime Metrik Perkotaan */}
            <div className="lg:col-span-5">
              <div className="rounded-card border border-border bg-surface p-6 shadow-subtle space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Status Sinkronisasi Kota
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-primary">Aktif</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl bg-surface-subtle border border-border/80">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Fasilitas Sanitasi
                    </p>
                    <p className="text-2xl font-black text-foreground mt-1 tabular-nums">
                      {totalSasaran > 0 ? totalSasaran.toLocaleString("id-ID") : "1.240+"}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Target sasaran terdata</p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-subtle border border-border/80">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Puskesmas</p>
                    <p className="text-2xl font-black text-foreground mt-1 tabular-nums">{totalPuskesmas || 22}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Wilayah kerja aktif</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-primary/25 bg-primary-subtle/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Inspeksi Lapangan Terverifikasi</span>
                    <span className="text-xs font-black text-primary tabular-nums">
                      {totalInspeksi > 0 ? `${totalInspeksi.toLocaleString("id-ID")} Dokumen` : "Aktif Berjalan"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    Standar baku mutu diverifikasi berkala oleh sanitarian profesional Dinas Kesehatan Kota Cirebon.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Lima Pilar Pokok Kesehatan Lingkungan */}
      <section id="pilar" className="py-20 border-b border-border/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Lima pilar pemantauan sanitasi kota.
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Instrumen pengawasan rutin terhadap sarana umum, pangan, air baku, limbah, dan perumahan masyarakat.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="rounded-card border border-border bg-surface p-6 space-y-3 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-primary-subtle text-primary border border-primary/20 flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">Tempat Pengelolaan Pangan (TPP)</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pengawasan higienes depot air minum, restoran, jasaboga, dan sentra kantin jajanan untuk mencegah risiko
                keracunan pangan.
              </p>
            </div>

            <div className="rounded-card border border-border bg-surface p-6 space-y-3 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-primary-subtle text-primary border border-primary/20 flex items-center justify-center">
                <Droplets className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">Sarana Air Bersih (SAB)</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pemeriksaan kualitas fisik dan mikrobiologis pada sumur gali terlindung, sumur bor, dan jaringan
                perpipaan air minum warga.
              </p>
            </div>

            <div className="rounded-card border border-border bg-surface p-6 space-y-3 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-primary-subtle text-primary border border-primary/20 flex items-center justify-center">
                <Waves className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">Saluran Pembuangan Air Limbah (SPAL)</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pemantauan teknis riool kota, tangki septik aman, dan resapan air limbah domestik bebas genangan
                pencemar lingkungan.
              </p>
            </div>

            <div className="rounded-card border border-border bg-surface p-6 space-y-3 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-primary-subtle text-primary border border-primary/20 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">Tempat-Tempat Umum (TTU)</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Standarisasi sanitasi fasilitas pelayanan kesehatan, sekolah, sarana ibadah, dan pasar demi keamanan
                ruang publik bersama.
              </p>
            </div>

            <div className="rounded-card border border-border bg-surface p-6 space-y-3 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-primary-subtle text-primary border border-primary/20 flex items-center justify-center">
                <Home className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">Rumah Sehat & Sanitasi Total (STBM)</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Verifikasi jamban keluarga sehat, ventilasi hunian, pengelolaan sampah terpilah, dan stop buang air
                besar sembarangan.
              </p>
            </div>

            <div className="rounded-card border border-border bg-surface-subtle p-6 space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-surface text-foreground border border-border flex items-center justify-center">
                  <HeartPulse className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-base font-bold text-foreground">Layanan Terpadu Sanitarian</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Konsultasi klinik sanitasi dan uji baku mutu sampel terhubung langsung ke jejaring laboratorium daerah
                  Kota Cirebon.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href={internalTargetHref}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                >
                  <span>Buka instrumen operasional</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Cakupan 22 Wilayah Puskesmas */}
      <section id="wilayah" className="py-20 border-b border-border/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Jejaring 22 wilayah kerja Puskesmas.
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Seluruh kelurahan di Kota Cirebon terhubung secara digital dalam sistem rekapitulasi data kesehatan
              lingkungan.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {activePuskesmas.map((nama, idx) => (
              <div
                key={nama}
                className="p-3 rounded-xl border border-border bg-surface hover:border-primary/40 transition-colors flex items-center gap-2.5"
              >
                <div className="w-6 h-6 rounded-lg bg-surface-subtle text-muted-foreground flex items-center justify-center shrink-0 text-[11px] font-bold">
                  {idx + 1}
                </div>
                <span className="text-xs font-bold text-foreground truncate">{nama}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Warta & Pengumuman Publik (Mendukung Gambar Brosur) */}
      <section id="pengumuman" className="py-20 border-b border-border/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
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
                  className="rounded-card border border-border bg-surface overflow-hidden flex flex-col shadow-2xs"
                >
                  {item.imageUrl && (
                    <div className="relative w-full h-44 bg-surface-subtle border-b border-border overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  )}

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary-subtle text-primary border border-primary/20">
                        {new Date(item.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2">{item.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 whitespace-pre-line">
                        {item.content}
                      </p>
                    </div>

                    <div className="pt-2">
                      <Link
                        href={internalTargetHref}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        <span>Lihat detail surat edaran</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-card border border-border bg-surface p-8 text-center space-y-2">
              <p className="text-sm font-bold text-foreground">Belum ada pengumuman publik aktif saat ini.</p>
              <p className="text-xs text-muted-foreground max-w-[45ch] mx-auto">
                Agenda berkala dan surat edaran higienes sanitasi akan ditampilkan langsung melalui portal ini.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 6. Footer Publik Sederhana & Ramah Regulasi */}
      <footer className="py-12 bg-surface text-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center p-0.5 shrink-0">
              <Image
                src="/logo.png"
                alt="Logo Kesling"
                width={24}
                height={24}
                className="w-full h-full object-contain"
              />
            </div>
            <span>
              Hak Cipta {new Date().getFullYear()} Dinas Kesehatan Kota Cirebon. Seluruh hak cipta dilindungi.
            </span>
          </div>

          <div className="flex items-center gap-5 font-medium">
            <Link href="/login" className="hover:text-foreground transition-colors">
              Masuk Petugas
            </Link>
            <Link href="/register" className="hover:text-foreground transition-colors">
              Pendaftaran Sanitarian
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
