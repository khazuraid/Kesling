import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { cacheGet, cacheSet } from "@/lib/redis";

export const GET = withAuth(async (req: NextRequest) => {
  const pkmId = Number(req.nextUrl.searchParams.get("puskesmasId")) || (req as any).user?.puskesmasId;
  if (!pkmId) return NextResponse.json({ error: "No puskesmas" }, { status: 400 });

  const bulan = Number(req.nextUrl.searchParams.get("bulan")) || new Date().getMonth() + 1;
  const tahun = Number(req.nextUrl.searchParams.get("tahun")) || new Date().getFullYear();

  const cacheKey = `dashboard:pkm:${pkmId}:${bulan}:${tahun}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return NextResponse.json(cached);

  // FIX: Use dynamic models instead of static ones
  // Previously only queried static LaporanTpp/Spal/etc, which missed all dynamic category data
  const categories = await prisma.dynamicCategory.findMany({
    where: { isActive: true },
    orderBy: { urutan: "asc" },
    include: {
      parameters: { orderBy: { urutan: "asc" } },
      subCategories: { orderBy: { urutan: "asc" } },
      formula: true,
    },
  });

  const allLaporan = await prisma.dynamicLaporan.findMany({
    where: { puskesmasId: pkmId, bulan, tahun },
    include: {
      category: { select: { nama: true, code: true, icon: true, isRowBased: true } },
      values: { include: { parameter: true, subCategory: true } },
    },
    orderBy: { category: { urutan: "asc" } },
  });

  const puskesmas = await prisma.puskesmas.findUnique({ where: { id: pkmId } });

  // Compute compliance per category
  const categoryScores = categories.map((cat) => {
    const laporanForCat = allLaporan.filter((l) => l.categoryId === cat.id);
    let pct = 0;
    let num = 0;
    let den = 0;
    let hasData = false;

    if (cat.formula) {
      const numParam = cat.parameters.find((p) => p.code === cat.formula?.numeratorCode);
      const denParam = cat.parameters.find((p) => p.code === cat.formula?.denominatorCode);

      if (numParam && denParam) {
        for (const lap of laporanForCat) {
          for (const v of lap.values) {
            if (v.parameterId === numParam.id) num += Number(v.value || 0);
            if (v.parameterId === denParam.id) den += Number(v.value || 0);
          }
        }
        pct = den > 0 ? Number(((num / den) * 100).toFixed(1)) : 0;
        hasData = laporanForCat.length > 0;
      }
    } else {
      hasData = laporanForCat.length > 0;
    }

    return {
      id: cat.id,
      code: cat.code,
      nama: cat.nama,
      icon: cat.icon,
      isRowBased: cat.isRowBased,
      pct,
      hasData,
      num,
      den,
      laporanCount: laporanForCat.length,
      status: laporanForCat[0]?.status || null,
    };
  });

  // Get targets for this puskesmas
  const dynamicTargets = await prisma.dynamicTarget.findMany({
    where: {
      tahun,
      OR: [{ puskesmasId: pkmId }, { puskesmasId: null }],
    },
  });

  const targets: Record<string, number> = {};
  const globalTargets = dynamicTargets.filter((t) => t.puskesmasId === null);
  const customTargets = dynamicTargets.filter((t) => t.puskesmasId === pkmId);
  for (const t of globalTargets) targets[t.categoryId] = t.targetPersen;
  for (const t of customTargets) targets[t.categoryId] = t.targetPersen; // override global

  const data = {
    puskesmas,
    categories: categoryScores,
    targets,
    laporan: allLaporan,
  };
  await cacheSet(cacheKey, data, 300);
  return NextResponse.json(data);
});
