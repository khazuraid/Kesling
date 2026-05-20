import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { cacheGet, cacheSet } from "@/lib/redis";

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = req.nextUrl;
  const bulan = Number(searchParams.get("bulan")) || new Date().getMonth() + 1;
  const tahun = Number(searchParams.get("tahun")) || new Date().getFullYear();

  const cacheKey = `ranking:${bulan}:${tahun}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return NextResponse.json(cached);

  const puskesmasList = await prisma.puskesmas.findMany({ orderBy: { urutan: "asc" } });

  const [tpp, spal, sab, jamban] = await Promise.all([
    prisma.laporanTpp.findMany({
      where: { bulan, tahun },
      select: { puskesmasId: true, diperiksa: true, laikJumlah: true },
    }),
    prisma.laporanSpal.findMany({
      where: { bulan, tahun },
      select: { puskesmasId: true, diperiksaJumlah: true, diperiksaMs: true },
    }),
    prisma.laporanSab.findMany({
      where: { bulan, tahun },
      select: { puskesmasId: true, diperiksaJumlah: true, diperiksaMs: true },
    }),
    prisma.laporanJamban.findMany({
      where: { bulan, tahun },
      select: { puskesmasId: true, diperiksaJumlah: true, diperiksaMs: true },
    }),
  ]);

  function calcTppPersen(pkmId: number) {
    const filtered = tpp.filter((i) => i.puskesmasId === pkmId);
    const total = filtered.reduce((s, i) => s + i.diperiksa, 0);
    const laik = filtered.reduce((s, i) => s + i.laikJumlah, 0);
    return total > 0 ? Math.round((laik / total) * 100) : 0;
  }

  function calcMsPersen(items: { puskesmasId: number; diperiksaJumlah: number; diperiksaMs: number }[], pkmId: number) {
    const filtered = items.filter((i) => i.puskesmasId === pkmId);
    const total = filtered.reduce((s, i) => s + i.diperiksaJumlah, 0);
    const ms = filtered.reduce((s, i) => s + i.diperiksaMs, 0);
    return total > 0 ? Math.round((ms / total) * 100) : 0;
  }

  const ranking = puskesmasList.map((pkm) => {
    const tppP = calcTppPersen(pkm.id);
    const spalP = calcMsPersen(spal, pkm.id);
    const sabP = calcMsPersen(sab, pkm.id);
    const jambanP = calcMsPersen(jamban, pkm.id);
    const avg = Math.round((tppP + spalP + sabP + jambanP) / 4);
    return { id: pkm.id, nama: pkm.nama, tpp: tppP, spal: spalP, sab: sabP, jamban: jambanP, avg };
  });

  ranking.sort((a, b) => b.avg - a.avg);

  await cacheSet(cacheKey, ranking, 300);
  return NextResponse.json(ranking);
});
