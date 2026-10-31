"use client";

import { Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
    <div className="inline-flex items-center gap-2">
      <div className="relative">
        <Calendar className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
        <Select
          value={bulan}
          onChange={(e) => setBulan(Number(e.target.value))}
          className="h-9 sm:h-10 pl-8 pr-7 rounded-button text-[12px] font-bold shadow-xs"
        >
          {BULAN.map((b, i) => (
            <option key={i} value={i + 1}>
              {b}
            </option>
          ))}
        </Select>
      </div>
      <Input
        type="number"
        value={tahun}
        onChange={(e) => setTahun(Number(e.target.value))}
        min={2020}
        max={2100}
        className="h-9 sm:h-10 w-20 px-2 rounded-button text-[12px] font-bold text-center tabular-nums shadow-xs"
      />
    </div>
  );
}
