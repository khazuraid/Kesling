"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <h2 className="text-xl font-bold text-red-600 mb-2">Terjadi Kesalahan</h2>
        <p className="text-sm text-slate-500 mb-4">{error.message || "Silakan coba lagi"}</p>
        <Button onClick={reset}>Coba Lagi</Button>
      </div>
    </div>
  );
}
