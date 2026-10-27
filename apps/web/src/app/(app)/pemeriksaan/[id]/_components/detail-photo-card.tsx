"use client";

import { ImageIcon } from "lucide-react";
import { useState } from "react";
import { photoSrc } from "@/lib/photo-url";

/**
 * Satu foto dokumentasi. Sebelumnya sebuah <div onClick> — tidak dapat dicapai
 * dengan papan ketik sama sekali.
 */
export function DetailPhotoCard({
  photo,
  index,
  single,
  onPreview,
}: {
  photo: { url: string; label?: string };
  index: number;
  single?: boolean;
  onPreview: (url: string) => void;
}) {
  const [hasError, setHasError] = useState(false);
  const src = photoSrc(photo.url);
  const label = photo.label || `Foto #${index + 1}`;

  return (
    <button
      type="button"
      onClick={() => src && onPreview(src)}
      disabled={!src || hasError}
      aria-label={`Perbesar ${label}`}
      className="group relative flex flex-col text-left rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden shadow-subtle hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2 transition-all"
    >
      <div
        className={`relative ${
          single ? "aspect-[16/10] sm:aspect-[4/3]" : "aspect-[4/3]"
        } bg-[hsl(var(--muted))]/30 overflow-hidden flex items-center justify-center`}
      >
        {hasError || !src ? (
          <div className="p-4 flex flex-col items-center justify-center text-center space-y-1.5 text-[hsl(var(--muted-foreground))]">
            <ImageIcon className="w-8 h-8 opacity-40" />
            <span className="text-[11px] font-semibold">Foto tidak dapat dimuat</span>
            <span className="text-[10px] opacity-70 truncate max-w-[180px]">{photo.url}</span>
          </div>
        ) : (
          <>
            {/* biome-ignore lint/performance/noImgElement: direct img prevents next/image runtime crash on arbitrary inspection uploads */}
            <img
              src={src}
              alt={label}
              loading="lazy"
              decoding="async"
              onError={() => setHasError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold">
              Klik untuk memperbesar
            </div>
          </>
        )}
      </div>
      <div className="p-3">
        <p className="text-[13px] font-bold text-[hsl(var(--foreground))] truncate">{label}</p>
        <span className="text-[11px] text-[hsl(var(--muted-foreground))] block mt-0.5">Dokumentasi Hasil Lapangan</span>
      </div>
    </button>
  );
}
