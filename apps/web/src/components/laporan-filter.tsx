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
    <div className="flex items-center border border-[hsl(var(--border))] bg-[hsl(var(--card))] h-11">
      <div className="flex items-center pl-3 pr-2 h-full">
        <Calendar className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))] mr-2 shrink-0" />
        <select
          value={bulan}
          onChange={(e) => setBulan(Number(e.target.value))}
          className="h-full bg-transparent border-none outline-none text-[12px] font-semibold text-[hsl(var(--foreground))] cursor-pointer [&>option]:text-black focus:ring-0"
        >
          {BULAN.map((b, i) => (
            <option key={i} value={i + 1}>
              {b}
            </option>
          ))}
        </select>
      </div>
      <div className="w-px h-4 bg-[hsl(var(--border))]" />
      <div className="flex items-center px-2 h-full">
        <input
          type="number"
          value={tahun}
          onChange={(e) => setTahun(Number(e.target.value))}
          min={2020}
          max={2100}
          className="h-full w-16 bg-transparent border-none outline-none text-[12px] font-semibold text-[hsl(var(--foreground))] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>
    </div>
  );
}
