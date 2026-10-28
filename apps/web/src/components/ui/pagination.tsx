"use client";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { pageRange, pageWindow } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import { Select } from "./select";

const PAGE_SIZES = [10, 25, 50];

type PaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  /** Bila diberikan, pemilih jumlah per halaman ikut tampil. */
  onLimitChange?: (limit: number) => void;
  isFetching?: boolean;
  /** Kata benda untuk teks hitungan, mis. "hasil", "entitas", "template". */
  noun?: string;
  className?: string;
};

const navClass =
  "inline-flex items-center gap-1 h-8 px-3 rounded-button border border-border bg-surface text-[11px] font-bold text-text-main shadow-subtle transition-colors hover:border-primary hover:text-primary disabled:opacity-40 disabled:pointer-events-none";

export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
  isFetching = false,
  noun = "data",
  className,
}: PaginationProps) {
  const totalSafe = Math.max(1, totalPages);
  const current = Math.min(Math.max(1, page), totalSafe);
  const { from, to } = pageRange(current, limit, total);
  const pages = pageWindow(current, totalSafe);

  // Satu halaman dan tanpa pemilih ukuran: tidak ada yang bisa diklik, jadi
  // cukup tampilkan hitungan. Footer tetap muncul supaya jumlah total selalu
  // terbaca — sebelumnya hilang sama sekali dan pengguna menyimpulkan paging
  // tidak ada.
  const hasNav = totalSafe > 1;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-border bg-surface",
        className,
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-[11px] font-bold text-muted-foreground tabular-nums whitespace-nowrap">
          {from === 0 ? "0" : `${from}–${to}`} dari {total} {noun}
        </span>
        {isFetching && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" aria-hidden />}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {onLimitChange && (
          <Select
            value={String(limit)}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            aria-label={`Jumlah ${noun} per halaman`}
            className="h-8 w-auto px-2.5 pr-8 text-[11px] font-bold"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size} / halaman
              </option>
            ))}
          </Select>
        )}

        {hasNav && (
          <>
            <button
              type="button"
              onClick={() => onPageChange(current - 1)}
              disabled={current <= 1}
              className={navClass}
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>

            {/* Angka halaman disembunyikan di layar sempit; Prev/Next tetap
                cukup dan barisnya tidak berdesakan. */}
            <div className="hidden sm:flex items-center gap-1">
              {pages.map((p, i) =>
                p === null ? (
                  <span
                    key={`gap-${i === 1 ? "l" : "r"}`}
                    className="w-7 text-center text-[11px] font-bold text-muted-foreground select-none"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onPageChange(p)}
                    aria-current={p === current ? "page" : undefined}
                    aria-label={`Halaman ${p}`}
                    className={cn(
                      "w-7 h-7 rounded-lg text-[11px] font-bold tabular-nums transition-all",
                      p === current
                        ? "bg-primary text-white shadow-subtle"
                        : "text-muted-foreground hover:bg-surface-subtle hover:text-foreground",
                    )}
                  >
                    {p}
                  </button>
                ),
              )}
            </div>

            <span className="sm:hidden text-[11px] font-bold text-muted-foreground tabular-nums px-1">
              {current}/{totalSafe}
            </span>

            <button
              type="button"
              onClick={() => onPageChange(current + 1)}
              disabled={current >= totalSafe}
              className={navClass}
              aria-label="Halaman berikutnya"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
