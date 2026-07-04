import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export const GET = withAuth(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const tahun = Number(sp.get("tahun")) || new Date().getFullYear();
  const puskesmasId = sp.get("puskesmasId") ? Number(sp.get("puskesmasId")) : undefined;

  const puskesmasList = await prisma.puskesmas.findMany({ orderBy: { urutan: "asc" } });
  const selectedPkm = puskesmasId ? puskesmasList.find((p) => p.id === puskesmasId) : undefined;

  const categories = await prisma.dynamicCategory.findMany({
    where: { isActive: true },
    orderBy: { urutan: "asc" },
    include: { parameters: { orderBy: { urutan: "asc" } }, formula: true },
  });

  const whereClause: any = { tahun };
  if (puskesmasId) whereClause.puskesmasId = puskesmasId;

  const allLaporan = await prisma.dynamicLaporan.findMany({
    where: { ...whereClause, status: { in: ["SUBMITTED", "APPROVED"] } },
    include: { values: true },
  });

  const laporan = categories.map((cat) => {
    const numParam = cat.formula ? cat.parameters.find((p) => p.code === cat.formula?.numeratorCode) : null;
    const denParam = cat.formula ? cat.parameters.find((p) => p.code === cat.formula?.denominatorCode) : null;

    let pctMonthly: number[] = BULAN.map(() => 0);
    let pctTotalYear: number | null = null;

    if (cat.formula && numParam && denParam) {
      pctMonthly = BULAN.map((_, i) => {
        const bulanData = allLaporan.filter((l) => l.categoryId === cat.id && l.bulan === i + 1);
        const n = bulanData.reduce(
          (s, l) => s + Number(l.values.find((v) => v.parameterId === numParam.id)?.value || 0),
          0,
        );
        const d = bulanData.reduce(
          (s, l) => s + Number(l.values.find((v) => v.parameterId === denParam.id)?.value || 0),
          0,
        );
        return d > 0 ? (n / d) * 100 : 0;
      });
      const totalN = pctMonthly.reduce((a, b) => a + (b > 0 ? 1 : 0), 0);
      pctTotalYear = totalN > 0 ? pctMonthly.reduce((a, b) => a + b, 0) / totalN : 0;
    }

    return { id: cat.id, icon: cat.icon, nama: cat.nama, pctMonthly, pctTotalYear: pctTotalYear || 0 };
  });

  const catsWithPct = laporan.filter((l) => l.pctTotalYear !== null && l.pctTotalYear > 0);
  const overallPct =
    catsWithPct.length > 0 ? catsWithPct.reduce((s, l) => s + (l.pctTotalYear || 0), 0) / catsWithPct.length : 0;

  const goodCount = catsWithPct.filter((l) => (l.pctTotalYear || 0) >= 80).length;
  const warnCount = catsWithPct.filter((l) => {
    const p = l.pctTotalYear || 0;
    return p >= 60 && p < 80;
  }).length;
  const badCount = catsWithPct.filter((l) => (l.pctTotalYear || 0) < 60).length;
  const overallLabel = overallPct >= 80 ? "Baik" : overallPct >= 60 ? "Cukup" : "Perlu Perhatian";

  return NextResponse.json({
    tahun,
    puskesmasId,
    selectedPkm: selectedPkm ? { nama: selectedPkm.nama } : undefined,
    puskesmasList: puskesmasList.map((p) => ({ id: p.id, nama: p.nama })),
    categories: laporan
      .filter((l) => l.pctTotalYear !== null)
      .map((l) => ({
        id: l.id,
        icon: l.icon,
        nama: l.nama,
        pctMonthly: l.pctMonthly,
        pctTotalYear: l.pctTotalYear || 0,
      })),
    overallPct,
    goodCount,
    warnCount,
    badCount,
    overallLabel,
  });
});
