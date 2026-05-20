import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { cacheGet, cacheSet } from "@/lib/redis";

export const GET = withAuth(async (_req: NextRequest) => {
  const tahun = new Date().getFullYear();

  const cacheKey = `trend:${tahun}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return NextResponse.json(cached);

  const [tpp, spal, sab, rumah, jamban, ttu] = await Promise.all(
    ["laporanTpp", "laporanSpal", "laporanSab", "laporanRumah", "laporanJamban", "laporanTtu"].map((model) =>
      (prisma as any)[model].groupBy({
        by: ["bulan"],
        where: { tahun },
        _count: { id: true },
      }),
    ),
  );

  const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  const data = BULAN.map((name, i) => {
    const b = i + 1;
    const find = (arr: any[]) => arr.find((r: any) => r.bulan === b)?._count?.id || 0;
    return {
      bulan: name,
      tpp: find(tpp),
      spal: find(spal),
      sab: find(sab),
      rumah: find(rumah),
      jamban: find(jamban),
      ttu: find(ttu),
    };
  });

  await cacheSet(cacheKey, data, 300);
  return NextResponse.json(data);
});
