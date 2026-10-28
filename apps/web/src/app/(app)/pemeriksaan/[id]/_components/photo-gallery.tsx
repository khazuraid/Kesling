"use client";

import { ImageIcon } from "lucide-react";
import type { InspectionPhoto } from "@/lib/inspection-media";
import { DetailPhotoCard } from "./detail-photo-card";

/**
 * Grid foto dokumentasi dengan petak seragam aspect-[4/3].
 * Satu foto: centered max-md, dua: 2 kolom, lebih: 2→3→4 kolom.
 */
export function PhotoGallery({ photos, onPreview }: { photos: InspectionPhoto[]; onPreview: (url: string) => void }) {
  if (photos.length === 0) {
    return (
      <div
        role="status"
        className="border border-dashed border-border rounded-2xl p-10 flex flex-col items-center justify-center text-center space-y-2"
      >
        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
          <ImageIcon className="w-6 h-6" />
        </div>
        <p className="text-[13px] font-bold text-foreground">Tidak Ada Foto Terlampir</p>
        <p className="text-[12px] text-muted-foreground max-w-sm">
          Pemeriksaan ini tidak menyertakan foto dokumentasi dari lapangan.
        </p>
      </div>
    );
  }

  const gridClass =
    photos.length === 1
      ? "max-w-sm mx-auto w-full"
      : photos.length === 2
        ? "grid grid-cols-2 max-w-2xl mx-auto gap-4"
        : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4";

  return (
    <div className={gridClass}>
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
