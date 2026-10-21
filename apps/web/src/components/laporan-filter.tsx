"use client";

import { Calendar } from "lucide-react";
import { useLaporanFilter } from "@/hooks/use-laporan-filter";

const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export function LaporanFilter() {
  const { bulan, setBulan, tahun, setTahun } = useLaporanFilter();

  return (
    <div className="inline-flex items-center rounded-full border border-border bg-surface-subtle hover:bg-surface text-foreground h-9 sm:h-10 px-2.5 transition-colors shadow-xs">
      <div className="flex items-center pl-1 pr-1.5 h-full">
        <Calendar className="w-3.5 h-3.5 text-muted-foreground mr-1.5 shrink-0" />
        <select
          value={bulan}
          onChange={(e) => setBulan(Number(e.target.value))}
          className="h-full bg-transparent border-none outline-none text-[12px] font-bold text-foreground cursor-pointer [&>option]:text-black focus:ring-0 appearance-none pr-1"
        >
          {BULAN.map((b, i) => (
            <option key={i} value={i + 1}>
              {b}
            </option>
          ))}
        </select>
      </div>
      <div className="w-px h-3.5 bg-border mx-1" />
      <div className="flex items-center px-1.5 h-full">
        <input
          type="number"
          value={tahun}
          onChange={(e) => setTahun(Number(e.target.value))}
          min={2020}
          max={2100}
          className="h-full w-14 bg-transparent border-none outline-none text-[12px] font-bold text-foreground text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>
    </div>
  );
}
