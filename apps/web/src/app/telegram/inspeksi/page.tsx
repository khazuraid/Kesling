"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { TelegramAuthGuard } from "@/components/telegram/telegram-auth-guard";

function RedirectToInspeksi() {
  const _router = useRouter();
  useEffect(() => {
    window.location.replace("/pemeriksaan");
  }, []);
  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center p-6">
      <p className="text-[12px] text-[hsl(var(--muted-foreground))]">Membuka form inspeksi...</p>
    </div>
  );
}

export default function TelegramInspeksiPage() {
  return (
    <TelegramAuthGuard>
      <RedirectToInspeksi />
    </TelegramAuthGuard>
  );
}
