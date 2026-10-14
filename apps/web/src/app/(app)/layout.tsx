import { Suspense } from "react";
import { CommandPalette } from "@/components/command-palette";
import { KeyboardHints } from "@/components/keyboard-hints";
import { SideNav } from "@/components/layout/sidebar";
import { SidebarOffset } from "@/components/layout/sidebar-offset";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SideNav />
      <SidebarOffset>
        <main className="w-full min-h-screen">
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[hsl(var(--muted))] border-t-[hsl(var(--accent))]" />
        <p className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.2em]">Memuat...</p>
      </div>
    </div>
  );
}
