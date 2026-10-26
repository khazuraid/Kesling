import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CommandPalette } from "@/components/command-palette";
import { KeyboardHints } from "@/components/keyboard-hints";
import { DesktopHeader } from "@/components/layout/desktop-header";
import { SideNav } from "@/components/layout/sidebar";
import { SidebarOffset } from "@/components/layout/sidebar-offset";
import { getCurrentUser } from "@/lib/session";

/**
 * Akun seed login dengan password sementara dan wajib menggantinya. Server
 * menolak seluruh API dengan 403 sebelum password diganti, jadi tanpa
 * pengalihan ini pengguna hanya melihat dashboard yang gagal memuat data.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user?.mustChangePassword) redirect("/profile?wajib-ganti-password=1");
  return <AppShell>{children}</AppShell>;
}

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SideNav />
      <SidebarOffset>
        <DesktopHeader />
        <main className="w-full min-h-[calc(100vh-4rem)] bg-canvas">
          <Suspense fallback={<LoadingSkeleton />}>{children}</Suspense>
        </main>
      </SidebarOffset>
      <CommandPalette />
      <KeyboardHints />
    </>
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
