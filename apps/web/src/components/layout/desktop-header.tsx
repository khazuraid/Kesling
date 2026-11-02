"use client";

import { Search, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { NotificationBell } from "@/components/notification-bell";

const ROUTE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Executive Dashboard", subtitle: "Ringkasan metrik kesehatan lingkungan terpadu" },
  "/dashboard-pkm": { title: "Command Center PKM", subtitle: "Monitoring & inspeksi sanitasi wilayah kerja" },
  "/pemeriksaan": { title: "Pemeriksaan Lapangan", subtitle: "Entri inspeksi sanitasi & verifikasi standar" },
  "/form-pemeriksaan": { title: "Form Template Builder", subtitle: "Konfigurasi instrumen dan parameter inspeksi" },
  "/data-dasar": { title: "Master Data Dasar", subtitle: "Baseline target sasaran sarana & fasilitas sanitasi" },
  "/laporan": { title: "Matriks Laporan", subtitle: "Kepatuhan pelaporan bulanan seluruh puskesmas" },
  "/rekap": { title: "Rekapitulasi Tahunan", subtitle: "Skor capaian indikator kinerja sanitasi lingkungan" },
  "/perbandingan": { title: "Analisis Komparasi", subtitle: "Perbandingan tren antar puskesmas & multi-tahun" },
  "/rencana-bulanan": { title: "Rencana Operasional Bulanan", subtitle: "Jadwal dan alokasi inspeksi sanitarian" },
  "/rencana-tahunan": { title: "Rencana Strategis Tahunan", subtitle: "Roadmap pencapaian target SPM sanitasi" },
  "/file-manager": { title: "Berkas & Berita Acara", subtitle: "Repositori arsip dokumen & sertifikasi digital" },
  "/approval": { title: "Verifikasi Berjenjang", subtitle: "Approval laporan dan hasil inspeksi operator" },
  "/laporan-builder": { title: "Desainer Format Laporan", subtitle: "Kustomisasi skema pelaporan dinamis" },
  "/settings": { title: "Pusat Pengaturan", subtitle: "Konfigurasi sistem, pengguna, dan integrasi bot" },
  "/profile": { title: "Profil Pengguna", subtitle: "Informasi akun & kredensial sesi operasional" },
  "/audit-log": { title: "Jejak Audit Sistem", subtitle: "Log aktivitas keamanan dan perubahan data" },
};

export function DesktopHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Find matching route or fallback
  let currentMeta = ROUTE_TITLES[pathname];
  if (!currentMeta) {
    if (pathname.startsWith("/laporan/")) {
      const catCode = pathname.replace("/laporan/", "").toUpperCase();
      currentMeta = {
        title: `Laporan Bulanan: ${catCode}`,
        subtitle: "Entri data dan kepatuhan indikator sanitasi bulanan",
      };
    } else if (pathname.startsWith("/data-dasar/")) {
      const catCode = pathname.replace("/data-dasar/", "").toUpperCase();
      currentMeta = {
        title: `Data Dasar: ${catCode}`,
        subtitle: "Baseline sasaran sarana fasilitas sanitasi",
      };
    } else if (pathname.startsWith("/settings/")) {
      currentMeta = {
        title: "Konfigurasi Sistem",
        subtitle: "Pengaturan preferensi modul operasional",
      };
    } else {
      currentMeta = {
        title: "Aplikasi Kesling Cirebon",
        subtitle: "Sistem Informasi Manajemen Kesehatan Lingkungan",
      };
    }
  }

  return (
    <header className="hidden md:flex sticky top-0 z-20 h-16 w-full items-center justify-between border-b border-border/80 bg-surface/85 backdrop-blur-xl px-6 transition-colors">
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-[13px] font-extrabold tracking-tight text-foreground truncate">{currentMeta.title}</h1>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-subtle text-primary border border-primary/20 shadow-2xs">
            <Sparkles className="w-2.5 h-2.5" />
            Civic System
          </span>
        </div>
        <p className="text-[11px] font-medium text-muted-foreground truncate">{currentMeta.subtitle}</p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {/* Quick Search */}
        <button
          onClick={() => document.dispatchEvent(new CustomEvent("kesling:open-palette"))}
          aria-label="Cari Cepat"
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/80 bg-surface-subtle hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium transition-all shadow-2xs"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Cari fitur / sasaran...</span>
          <kbd className="inline-flex items-center gap-0.5 rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-mono font-bold text-muted-foreground">
            ⌘K
          </kbd>
        </button>

        {/* Notification Bell */}
        <div className="flex items-center justify-center p-1 rounded-xl border border-border/80 bg-surface hover:bg-surface-subtle transition-all shadow-2xs">
          <NotificationBell placement="bottom" />
        </div>

        {/* Puskesmas/Role Badge */}
        <div className="flex items-center gap-2 pl-3 border-l border-border/80">
          <div className="w-8 h-8 rounded-xl bg-primary-subtle border border-primary/25 flex items-center justify-center text-xs font-black text-primary shadow-2xs">
            {session?.user?.name?.charAt(0) || "K"}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-foreground leading-tight truncate max-w-[130px]">
              {session?.user?.name || "Sanitarian"}
            </span>
            <span className="text-[10px] font-bold text-muted-foreground leading-none uppercase tracking-wider mt-0.5">
              {(session?.user as any)?.role || "Operator"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
