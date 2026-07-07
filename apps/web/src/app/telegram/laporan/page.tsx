"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { TelegramAuthGuard } from "@/components/telegram/telegram-auth-guard";

function RedirectToLaporan() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/laporan");
  }, [router]);
  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center p-6">
      <p className="text-[12px] text-[hsl(var(--muted-foreground))]">Membuka form laporan...</p>
    </div>
  );
}

export default function TelegramLaporanPage() {
  return (
    <TelegramAuthGuard>
      <RedirectToLaporan />
    </TelegramAuthGuard>
  );
}
