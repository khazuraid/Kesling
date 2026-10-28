"use client";

import { Search, X } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";

export type ActiveFilter = {
  /** Kunci unik untuk React; sekaligus penanda filter apa yang menyala. */
  key: string;
  label: string;
  /** Bila diberikan, chip dapat dihapus satu-satu. */
  onRemove?: () => void;
};

const dateInputClass =
  "h-9 px-2.5 rounded-button bg-surface-subtle border border-border text-[11px] font-medium text-text-main outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors";

/**
 * Rentang tanggal untuk diletakkan di dalam FilterBar. Selalu terlihat, bukan
 * disembunyikan di balik tombol: dua input tanggal tidak cukup berharga untuk
 * satu klik tambahan, dan menyembunyikannya membuat filter yang sedang aktif
 * tak terlihat.
 */
export function DateRangeInputs({
  from,
  to,
  onChange,
  labelFrom = "Dari",
  labelTo = "Sampai",
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  labelFrom?: string;
  labelTo?: string;
}) {
  return (
    <div className="shrink-0 flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5">
        <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">{labelFrom}</label>
        <input
          type="date"
          value={from}
          onChange={(e) => onChange(e.target.value, to)}
          className={dateInputClass}
          aria-label={`Tanggal ${labelFrom.toLowerCase()}`}
        />
      </div>
      <div className="flex items-center gap-1.5">
        <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">{labelTo}</label>
        <input
          type="date"
          value={to}
          onChange={(e) => onChange(from, e.target.value)}
          className={dateInputClass}
          aria-label={`Tanggal ${labelTo.toLowerCase()}`}
        />
      </div>
    </div>
  );
}

type FilterBarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  /** Select, input tanggal, atau pill — disusun pemanggil. */
  children?: ReactNode;
  /**
   * Filter terpasang selain pencarian. Ditampilkan sebagai chip yang bisa
   * dihapus; tanpa ini pengguna tidak punya cara tahu filter mana yang aktif
   * dan menyangka datanya kosong.
   */
  activeFilters?: ActiveFilter[];
  onReset?: () => void;
  debounceMs?: number;
  isFetching?: boolean;
  className?: string;
};

export function FilterBar({
  searchValue,
  onSearchChange,
  placeholder = "Cari...",
  children,
  activeFilters = [],
  onReset,
  debounceMs = 350,
  isFetching = false,
  className,
}: FilterBarProps) {
  const [local, setLocal] = useState(searchValue);
  const onChangeRef = useRef(onSearchChange);
  onChangeRef.current = onSearchChange;

  // Sinkronkan saat nilai di luar berubah (mis. tombol Reset), tanpa menimpa
  // apa yang sedang diketik: kalau nilainya sama dengan yang terakhir kita
  // kirim, ketikan pengguna belum sampai dan tidak boleh dihapus.
  useEffect(() => {
    setLocal((prev) => (prev === searchValue ? prev : searchValue));
  }, [searchValue]);

  useEffect(() => {
    if (local === searchValue) return;
    const timer = window.setTimeout(() => onChangeRef.current(local.trim()), debounceMs);
    return () => window.clearTimeout(timer);
  }, [local, searchValue, debounceMs]);

  const hasFilters = Boolean(searchValue) || activeFilters.length > 0;

  return (
    <div className={cn("rounded-card border border-border bg-surface shadow-subtle", className)}>
      {/* flex-wrap: tanpa ini input pencarian, select, dan tombol tanggal
          berdesakan di lebar 640–900px dan saling menghimpit. */}
      <div className="flex flex-wrap items-center gap-2 p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="h-10 pl-10 pr-9 text-[13px] font-medium"
          />
          {local && (
            <button
              type="button"
              onClick={() => {
                setLocal("");
                onChangeRef.current("");
              }}
              aria-label="Bersihkan pencarian"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {children}

        {isFetching && (
          <span className="w-4 h-4 shrink-0 border-2 border-border border-t-primary rounded-full animate-spin" />
        )}
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-3 pb-3 pt-0">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mr-0.5">
            Filter aktif
          </span>
          {activeFilters.map((f) => (
            <span
              key={f.key}
              className="inline-flex items-center gap-1 h-6 pl-2.5 pr-1 rounded-pill bg-primary-subtle border border-primary/25 text-[11px] font-bold text-primary"
            >
              {f.label}
              {f.onRemove && (
                <button
                  type="button"
                  onClick={f.onRemove}
                  aria-label={`Hapus filter ${f.label}`}
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-primary/15 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
          {onReset && hasFilters && (
            <button
              type="button"
              onClick={onReset}
              className="h-6 px-2.5 ml-0.5 rounded-pill text-[11px] font-extrabold text-error hover:bg-error-light transition-colors"
            >
              Reset semua
            </button>
          )}
        </div>
      )}
    </div>
  );
}
