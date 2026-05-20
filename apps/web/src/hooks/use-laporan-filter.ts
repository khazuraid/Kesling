"use client";

import { parseAsInteger, useQueryState } from "nuqs";

export function useLaporanFilter() {
  const now = new Date();
  const [bulan, setBulan] = useQueryState("bulan", parseAsInteger.withDefault(now.getMonth() + 1));
  const [tahun, setTahun] = useQueryState("tahun", parseAsInteger.withDefault(now.getFullYear()));

  return { bulan, setBulan, tahun, setTahun };
}
