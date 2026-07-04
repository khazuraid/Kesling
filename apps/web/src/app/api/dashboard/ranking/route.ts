import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { cacheGet, cacheSet } from "@/lib/redis";

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = req.nextUrl;
  const bulan = Number(searchParams.get("bulan")) || new Date().getMonth() + 1;
  const tahun = Number(searchParams.get("tahun")) || new Date().getFullYear();

  const cacheKey = `ranking:dynamic:${bulan}:${tahun}`;
  try {
    const cached = await cacheGet(cacheKey);
    if (cached) return NextResponse.json(cached);
  } catch {}

  const [puskesmasList, categories] = await Promise.all([
    prisma.puskesmas.findMany({ orderBy: { urutan: "asc" } }),
    prisma.dynamicCategory.findMany({
      where: { isActive: true },
      orderBy: { urutan: "asc" },
      include: { parameters: true, formula: true },
    }),
  ]);

  // FIX 1: Only include SUBMITTED or APPROVED laporan in ranking calculation
  // DRAFT data should NOT count toward compliance scores -- this is an approval workflow
  const allLaporan = await prisma.dynamicLaporan.findMany({
    where: { bulan, tahun, status: { in: ["SUBMITTED", "APPROVED"] } },
    include: { values: true },
  });

  // Also count DRAFT per puskesmas so front-end can show "X drafts pending"
  const draftCounts = await prisma.dynamicLaporan.groupBy({
    by: ["puskesmasId"],
    where: { bulan, tahun, status: "DRAFT" },
    _count: { id: true },
  });

  const ranking = puskesmasList.map((pkm) => {
    const scores: Record<string, number> = {};
    let categoriesWithData = 0;

    for (const cat of categories) {
      const laporan = allLaporan.filter((l) => l.puskesmasId === pkm.id && l.categoryId === cat.id);
      let pct = 0;

      if (cat.formula && laporan.length > 0) {
        const numParam = cat.parameters.find((p) => p.code === cat.formula?.numeratorCode);
        const denParam = cat.parameters.find((p) => p.code === cat.formula?.denominatorCode);

        if (numParam && denParam) {
          let num = 0;
          let den = 0;
          for (const lap of laporan) {
            num += Number(lap.values.find((v) => v.parameterId === numParam.id)?.value || 0);
            den += Number(lap.values.find((v) => v.parameterId === denParam.id)?.value || 0);
          }
          // FIX 2: Use toFixed(1) for consistency with front-end calcCompliance
          pct = den > 0 ? Number(((num / den) * 100).toFixed(1)) : 0;
          categoriesWithData++;
        }
      } else if (laporan.length > 0) {
        categoriesWithData++;
      }

      scores[cat.code] = pct;
    }

    // FIX 3: Only average categories that actually have submitted data
    // Previously averaged ALL categories (0s dragged avg down unfairly)
    const avg =
      categoriesWithData > 0
        ? Number(
            (
              Object.values(scores)
                .filter((v) => v > 0)
                .reduce((s, v) => s + v, 0) / categoriesWithData
            ).toFixed(1),
          )
        : 0;

    const draftCount = draftCounts.find((d) => d.puskesmasId === pkm.id)?._count?.id || 0;

    return {
      id: pkm.id,
      nama: pkm.nama,
      ...scores,
      avg,
      draftCount,
      categoriesWithData,
    };
  });

  ranking.sort((a, b) => b.avg - a.avg);

  try {
    await cacheSet(cacheKey, ranking, 300);
  } catch {}

  return NextResponse.json(ranking);
});
