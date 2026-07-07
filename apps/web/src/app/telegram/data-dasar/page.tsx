"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { TelegramAuthGuard } from "@/components/telegram/telegram-auth-guard";

function RedirectToDataDasar() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/data-dasar");
  }, [router]);
  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center p-6">
      <p className="text-[12px] text-[hsl(var(--muted-foreground))]">Membuka form data dasar...</p>
    </div>
  );
}

export default function TelegramDataDasarPage() {
  return (
    <TelegramAuthGuard>
      <RedirectToDataDasar />
    </TelegramAuthGuard>
  );
}
