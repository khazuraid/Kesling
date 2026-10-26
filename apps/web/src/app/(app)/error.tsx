"use client";

import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { useEffect } from "react";

/**
 * Error boundary untuk seluruh halaman di dalam (app).
 *
 * `digest` adalah id yang Next hasilkan untuk error server; hanya itu yang
 * ditampilkan ke pengguna — pesan asli bisa memuat detail internal (query,
 * nama kolom, path) sehingga tidak layak ditampilkan.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[app error boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </span>

        <h1 className="text-[17px] font-black text-foreground">Terjadi Kesalahan</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          Halaman ini gagal dimuat. Coba muat ulang; bila tetap gagal, laporkan kode kesalahan di bawah ke admin.
        </p>

        {error.digest && (
          <p className="mt-3 rounded-lg bg-muted px-3 py-2 font-mono text-[12px] text-muted-foreground">
            Kode: {error.digest}
          </p>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[12px] font-extrabold text-primary-foreground transition-colors hover:opacity-90"
          >
            <RotateCcw className="h-4 w-4" /> Coba Lagi
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-[12px] font-bold text-foreground transition-colors hover:bg-muted"
          >
            <Home className="h-4 w-4" /> Ke Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
