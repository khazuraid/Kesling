import { Suspense } from "react";
import { AnnouncementModal } from "@/components/announcement-modal";
import { CommandPalette } from "@/components/command-palette";
import { DonationModal } from "@/components/donation/donation-modal";
import { KeyboardHints } from "@/components/keyboard-hints";
import { DesktopHeader } from "@/components/layout/desktop-header";
import { SideNav } from "@/components/layout/sidebar";
import { SidebarOffset } from "@/components/layout/sidebar-offset";

/**
 * Pengalihan wajib-ganti-password TIDAK di sini. Layout ini juga membungkus
 * halaman /profile, sehingga pengalihan ke /profile akan memicu layout yang
 * sama untuk mengalihkan lagi — tanpa henti (ERR_TOO_MANY_REDIRECTS).
 * Pengalihannya ada di proxy.ts, yang memegang pathname sehingga bisa
 * mengecualikan halaman tujuan itu sendiri.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-canvas flex flex-col selection:bg-primary/20">
      <SideNav />
      <SidebarOffset>
        <DesktopHeader />
        <main className="w-full min-h-[calc(100dvh-4rem)] bg-canvas p-0">
          <Suspense fallback={<LoadingSkeleton />}>{children}</Suspense>
        </main>
      </SidebarOffset>
      <AnnouncementModal />
      <DonationModal />
      <CommandPalette />
      <KeyboardHints />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">Memuat...</p>
      </div>
    </div>
  );
}
