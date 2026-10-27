"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

/**
 * Lightbox foto layar penuh.
 *
 * Tiga hal yang sebelumnya tidak ada dan wajib untuk papan ketik: fokus
 * dipindahkan ke dalam saat dibuka lalu dikembalikan ke pemicunya saat ditutup,
 * Tab berputar di dalam (tidak bocor ke halaman di belakang overlay), dan
 * tombol-tombolnya punya nama yang terbaca pembaca layar.
 */
export function PhotoLightbox({
  photos,
  index,
  onIndexChange,
  onClose,
}: {
  photos: { url: string; label?: string }[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocused = useRef<Element | null>(null);
  const photo = photos[index];

  const step = useCallback(
    (dir: number) => {
      if (photos.length < 2) return;
      onIndexChange((index + dir + photos.length) % photos.length);
    },
    [index, photos.length, onIndexChange],
  );

  useEffect(() => {
    lastFocused.current = document.activeElement;
    closeRef.current?.focus();
    return () => {
      if (lastFocused.current instanceof HTMLElement) lastFocused.current.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        step(e.key === "ArrowRight" ? 1 : -1);
        return;
      }
      if (e.key !== "Tab" || !boxRef.current) return;
      const focusable = boxRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, step]);

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4 animate-in fade-in"
    >
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Pratinjau foto: ${photo?.label || "Foto Dokumentasi"}`}
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center rounded-2xl bg-black/60 p-2 border border-white/10"
      >
        {/* biome-ignore lint/performance/noImgElement: direct img for fullscreen zoom preview */}
        <img
          src={photo?.url}
          alt={photo?.label || "Pratinjau foto"}
          className="max-h-[80vh] max-w-full w-auto h-auto object-contain rounded-xl"
        />
        <div className="w-full flex items-center justify-between mt-3 px-2 text-white/80 gap-3">
          <span className="text-[12px] font-medium truncate">
            {photo?.label || "Foto Dokumentasi"}
            {photos.length > 1 && (
              <span className="tabular-nums text-white/60">
                {" "}
                · {index + 1}/{photos.length}
              </span>
            )}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Foto sebelumnya"
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Foto berikutnya"
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
            <a
              href={photo?.url}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white text-white text-[11px] font-bold transition-colors"
            >
              Buka Asli
            </a>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Tutup pratinjau foto"
              className="p-2 rounded-lg bg-white/10 hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
