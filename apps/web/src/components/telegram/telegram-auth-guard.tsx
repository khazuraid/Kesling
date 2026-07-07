"use client";

import { Loader2, ShieldAlert } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface TelegramAuthGuardProps {
  children: React.ReactNode;
}

export function TelegramAuthGuard({ children }: TelegramAuthGuardProps) {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Pastikan script Telegram WebApp ada
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) {
      setLoading(false);
      setError("Aplikasi ini hanya dapat dijalankan di dalam Telegram.");
      return;
    }

    // Beritahukan Telegram kalau app sudah siap & expand
    tg.ready();
    tg.expand();

    // 2. Jika NextAuth sudah login, selesai
    if (status === "authenticated") {
      setLoading(false);
      return;
    }

    if (status === "loading") {
      return;
    }

    // 3. Jika belum login NextAuth, coba login otomatis pakai initData
    const initData = tg.initData;
    if (!initData) {
      setLoading(false);
      setError("Data otentikasi Telegram tidak ditemukan.");
      return;
    }

    signIn("telegram", { initData, redirect: false })
      .then((res) => {
        if (res?.error) {
          setError(
            "Akun Telegram Anda belum terhubung dengan akun Kesling.\n\n" +
              "Silakan ketik /login di bot Telegram Anda terlebih dahulu untuk pairing.",
          );
        }
      })
      .catch(() => {
        setError("Gagal melakukan otentikasi otomatis.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [status]);

  if (loading || status === "loading") {
    return (
      <div className="fixed inset-0 bg-[hsl(var(--background))] flex flex-col items-center justify-center p-6 space-y-4">
        <Loader2 className="w-8 h-8 text-[hsl(var(--accent))] animate-spin" />
        <p className="text-[12px] font-medium text-[hsl(var(--muted-foreground))]">Mempersiapkan sesi...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-[hsl(var(--background))] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 bg-[hsl(var(--error))]/10 border border-[hsl(var(--error))]/20 flex items-center justify-center rounded-full text-[hsl(var(--error))]">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-[14px] font-bold text-[hsl(var(--foreground))]">Akses Ditolak</h2>
          <p className="text-[11px] text-[hsl(var(--muted-foreground))] max-w-xs whitespace-pre-line">{error}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            const tg = (window as any).Telegram?.WebApp;
            if (tg) tg.close();
          }}
          className="h-9 px-4 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-[11px] font-bold uppercase tracking-wider hover:bg-[hsl(var(--accent))] hover:text-white transition-colors"
        >
          Tutup Aplikasi
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
