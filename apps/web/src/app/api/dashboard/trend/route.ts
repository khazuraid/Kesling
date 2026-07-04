import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { cacheGet, cacheSet } from "@/lib/redis";

export const GET = withAuth(async (_req: NextRequest) => {
  const tahun = new Date().getFullYear();

  const cacheKey = `trend:dynamic:${tahun}`;
  try {
    const cached = await cacheGet(cacheKey);
    if (cached) return NextResponse.json(cached);
  } catch (err) {
    console.error("Redis cache error:", err);
  }

  try {
    // Fetch all active categories with formulas and parameters
    const categories = await prisma.dynamicCategory.findMany({
      where: { isActive: true },
      include: { parameters: true, formula: true },
    });

    // Fetch all SUBMITTED/APPROVED laporan for the year
    // FIX: Previously used DRAFT data too, and only showed count, not compliance %
    const allLaporan = await prisma.dynamicLaporan.findMany({
      where: { tahun, status: { in: ["SUBMITTED", "APPROVED"] } },
      include: { values: true },
    });

    const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

    // Calculate compliance percentage per month per category
    // FIX: Previously only showed _count (number of laporan), which was misleading
    const data = BULAN.map((name, i) => {
      const bulan = i + 1;
      const item: Record<string, any> = { bulan: name };

      for (const cat of categories) {
        if (cat.formula) {
          const numParam = cat.parameters.find((p) => p.code === cat.formula?.numeratorCode);
          const denParam = cat.parameters.find((p) => p.code === cat.formula?.denominatorCode);

          if (numParam && denParam) {
            const bulanLaporan = allLaporan.filter((l) => l.bulan === bulan && l.categoryId === cat.id);

            let num = 0;
            let den = 0;
            for (const lap of bulanLaporan) {
              num += Number(lap.values.find((v) => v.parameterId === numParam.id)?.value || 0);
              den += Number(lap.values.find((v) => v.parameterId === denParam.id)?.value || 0);
            }

            item[cat.code] = den > 0 ? Number(((num / den) * 100).toFixed(1)) : null;
          } else {
            item[cat.code] = null;
          }
        } else {
          // Categories without formula: show submission count
          const bulanCount = allLaporan.filter((l) => l.bulan === bulan && l.categoryId === cat.id).length;
          item[cat.code] = bulanCount;
        }
      }

      return item;
    });

    try {
      await cacheSet(cacheKey, data, 300);
    } catch (err) {
      console.error("Redis cache set error:", err);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch trend data" }, { status: 500 });
  }
});
