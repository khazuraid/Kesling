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
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-pulse">
      {/* Header wireframe */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-4 w-28 bg-muted rounded-md" />
          <div className="h-8 w-56 bg-muted rounded-lg" />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-24 bg-muted rounded-lg" />
          <div className="h-9 w-32 bg-muted rounded-lg" />
        </div>
      </div>

      {/* Bento grid wireframe */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 rounded-xl border border-border bg-surface space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-muted rounded" />
              <div className="h-8 w-8 rounded-lg bg-muted" />
            </div>
            <div className="h-7 w-28 bg-muted rounded" />
            <div className="h-3 w-36 bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* Content panel wireframe */}
      <div className="p-6 rounded-xl border border-border bg-surface space-y-4">
        <div className="h-5 w-48 bg-muted rounded" />
        <div className="space-y-2.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 w-full bg-muted/60 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
