import { Suspense } from "react";
import { CommandPalette } from "@/components/command-palette";
import { KeyboardHints } from "@/components/keyboard-hints";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <div className="lg:pl-[248px]">
        <Header />
        <main className="pl-5 pt-0 md:pt-0">
          <Suspense fallback={<LoadingSkeleton />}>{children}</Suspense>
        </main>
      </div>
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
        <p className="text-[var(--text-xs)] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.2em]">
          Memuat...
        </p>
      </div>
    </div>
  );
}
