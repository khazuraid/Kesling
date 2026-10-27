"use client";

import { ImageIcon } from "lucide-react";
import type { InspectionPhoto } from "@/lib/inspection-media";
import { DetailPhotoCard } from "./detail-photo-card";

/**
 * Grid foto dokumentasi. Tata letak menyesuaikan jumlah foto: satu foto
 * ditengahkan agar tidak melebar penuh, dua foto berdampingan, selebihnya tiga
 * kolom.
 */
export function PhotoGallery({ photos, onPreview }: { photos: InspectionPhoto[]; onPreview: (url: string) => void }) {
  if (photos.length === 0) {
    return (
      <div
        role="status"
        className="border border-dashed border-[hsl(var(--border))] rounded-2xl p-10 flex flex-col items-center justify-center text-center space-y-2"
      >
        <div className="w-12 h-12 rounded-2xl bg-[hsl(var(--muted))] flex items-center justify-center text-[hsl(var(--muted-foreground))]">
          <ImageIcon className="w-6 h-6" />
        </div>
        <p className="text-[13px] font-bold text-[hsl(var(--foreground))]">Tidak Ada Foto Terlampir</p>
        <p className="text-[12px] text-[hsl(var(--muted-foreground))] max-w-sm">
          Pemeriksaan ini tidak menyertakan foto dokumentasi dari lapangan.
        </p>
      </div>
    );
  }

  const layout =
    photos.length === 1
      ? "max-w-md mx-auto w-full"
      : photos.length === 2
        ? "grid grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto gap-4"
        : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4";

  return (
    <div className={layout}>
      {photos.map((photo, idx) => (
        <DetailPhotoCard
          key={`${photo.url}-${idx}`}
          photo={photo}
          index={idx}
          single={photos.length === 1}
          onPreview={onPreview}
        />
      ))}
    </div>
  );
}
